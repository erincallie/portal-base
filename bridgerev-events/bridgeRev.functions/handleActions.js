const fs = require('fs');
const axios = require('axios');
const path = require('path');
const authToken = process.env.brAPIkey;

exports.main = async (context, sendResponse) => {
  
  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };
  
  let properties = context.body.properties;
  let newObjectId;
  let fileURL;
        
  async function updateObject(endpoint, properties, associations, headers) {
    const data = await axios.patch(endpoint, { properties, associations }, { headers })
    .then(function(response) {
      console.log(response);
    })
    .catch(function(error) {
      console.log(error.message);
      throw error
    });
  }
  
  async function createAssociation(endpoint, body, headers) {
    const data = await axios.put(endpoint, body, { headers })
    .then(function(response) {
      //console.log(response);
    })
    .catch(function(error) {
      //console.log(error.message);
      throw error
    });
  }
  
  async function deleteAssociation(endpoint, body, headers) {
    const data = await axios.delete(endpoint, body, { headers })
    .then(function(response) {
      //console.log(response);
    })
    .catch(function(error) {
      //console.log(error.message);
      throw error
    });
  }
  
  function unescapeHtml(escapedHtml) {
    return String(escapedHtml)
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }
  
  if (properties.description) {
    let unescape_content = unescapeHtml(properties.content);
    properties.content = unescape_content;
  }
  
  if (properties.bio) {
    let unescape_content = unescapeHtml(properties.bio);
    properties.bio = unescape_content;
  }
  
  function getFileName(base64String) {
    var part_one = base64String.split("data:image/")[0];
    var part_two = part_one.split(";base64")[0];
    var part_three = part_two.replace(/^C:\\fakepath\\/i, "").split(".")[1];
    return part_three;
  }
  function getContentTypeFromBase64(base64String) {
    var part_one = base64String.split("data:image/")[0];
    var part_two = part_one.split(";base64")[0];
    var part_three = part_two.replace(/^C:\\fakepath\\/i, "").split(".");
    return part_three;
  }
  
  async function uploadBase64AsFile(base64Image, uploadUrl) {
    // Convert base64 string to a Buffer, removing the Data URI part if present
    const base64Data = base64Image.replace(/^data:([A-Za-z-+/]+);base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    let parts = getContentTypeFromBase64(base64Image);

    // Write the buffer to a file
    const filePath = path.join('/tmp', `profile-upload`); // Modify with your desired path and filename
    fs.writeFileSync(filePath, buffer);

    // Now you can use the previously provided code to upload the file
    try {
      // Extract the file name
      const filename = path.basename(filePath);

      // Prepare the form data
      const boundary = `----WebKitFormBoundary${Math.random().toString(16)}`;
      let data = '';
      let these_headers = {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Authorization': `Bearer ${authToken}`
      };

      // Add folderPath as a part of the form-data
      data += `--${boundary}\r\n`;
      data += `Content-Disposition: form-data; name="folderPath"\r\n\r\n`;
      data += `/uploads\r\n`;
      const options = {
        access: "PUBLIC_INDEXABLE"
      };
      data += `--${boundary}\r\n`;
      data += `Content-Disposition: form-data; name="options"\r\n\r\n`;
      data += `${JSON.stringify(options)}\r\n`;

      // Add file data as a part of the form-data
      data += `--${boundary}\r\n`;
      data += `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n`;
      data += `Content-Type: application/octet-stream\r\n\r\n`;

      // Combine all parts into a single Buffer
      const payload = Buffer.concat([
        Buffer.from(data, 'utf-8'),
        buffer,
        Buffer.from(`\r\n--${boundary}--`, 'utf-8'),
      ]);

      // Include the boundary in the content type header
      these_headers['Content-Type'] = `multipart/form-data; boundary=${boundary}`;

      // Make the request
      const response = await axios.post(uploadUrl, payload, {
        headers: these_headers,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      // Handle the response as needed
      console.log('File uploaded successfully:', response.data.url);
      return response.data.url;
    } catch (error) {
      console.error('Failed to upload file:', error.message);
    } finally {
      // Clean up: delete the temporary file
      fs.unlinkSync(filePath);
    }
  }
  
  let image_file,
      picture_file;
  if (properties.featured_image) {
    //image_file = await uploadBase64AsFile(properties.featured_image, "https://api.hubapi.com/files/v3/files");
    properties["featured_image"] = image_file;
  }
  
  if (properties.profile_picture) {
    console.log(properties.profile_picture);
    //picture_file = await uploadBase64AsFile(properties.profile_picture, "https://api.hubapi.com/files/v3/files");
    properties["profile_picture"] = picture_file;
  }
  
  if (Object.keys(properties).length > 0) {
    let objectType = context.body.objectType;
    let objectId = context.body.objectId;
    let endpoint = `https://api.hubapi.com/crm/v3/objects/${objectType}/${objectId}`;
    let update_response = await updateObject(endpoint, properties, [], headers);
    console.log(update_response);
    if (picture_file || image_file) {
      let this_pic = picture_file || image_file;
        sendResponse({body: {message:this_pic}, statusCode: 200});
    }
  }
  
  if (context.body.options) {
    let fromObjectType = context.body.options.fromObjectType;
    let fromObjectId = context.body.options.fromObjectId;
    let toObjectType = context.body.options.toObjectType;
    let toObjectId = context.body.options.toObjectId;
    let assocTypeId = context.body.options.assocTypeId;
    let endpoint = `https://api.hubapi.com/crm/v4/objects/${fromObjectType}/${fromObjectId}/associations/${toObjectType}/${toObjectId}/`;
    console.log(endpoint);
    let body = [ 
      {
        "associationCategory": "USER_DEFINED",
        "associationTypeId": assocTypeId
      }
    ];
    if (context.body.options.action == "create") {
      let update_response = await createAssociation(endpoint, body, headers);
    } else {
      let delete_response = await deleteAssociation(endpoint, body, headers);
    }
  }
}
