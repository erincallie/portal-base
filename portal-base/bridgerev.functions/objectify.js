const fs = require('fs');
const axios = require('axios');
const path = require('path');
const authToken = process.env.brAPIkey;

exports.main = async (context, sendResponse) => {

  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };

  let custom = context.body.custom;
  let properties = Object.keys(context.body.properties).length > 0 ? context.body.properties : null;
  let objectId = context.body.objectId;
  let objectType = context.body.objectType;
  let newObjectId;
  let fileURL;
  
  async function batchCreateObjects(object, data) {
    let batch_endpoint = `https://api.hubapi.com/crm/v3/objects/${object}/batch/create`;
    try {
      let api_response = await axios.post(batch_endpoint, { "inputs": [data] }, { headers });
    } catch (error) {
      console.log(error.message);
      throw error
    }
  }

  async function createObject(url, SimplePublicObjectInputForCreate) {
    try {
      const { data } = await axios.post(url, SimplePublicObjectInputForCreate, { headers });
      return data
    } catch (error) {
      throw error
    }
  }
  
  async function createAssociation(endpoint, body, headers) {
    const data = await axios.put(endpoint, body, { headers })
    .then(function(response) {
      console.log(response);
    })
    .catch(function(error) {
      console.log(error.message);
      throw error
    });
  }

  async function create_object(thisObjectType, properties, associations) {
    const url = 'https://api.hubapi.com/crm/v3/objects/' + thisObjectType;
    const SimplePublicObjectInputForCreate = { 
      properties: properties, 
      associations: associations
    };
    let response = createObject(url, SimplePublicObjectInputForCreate);
    return response
  }

  async function updateObject(endpoint, properties, headers) {
    const data = await axios.patch(endpoint, { properties }, { headers })
    .then(function(response) {
      console.log(response);
    })
    .catch(function(error) {
      console.log(error.message);
      throw error
    });
  }

  async function uploadBase64AsFile(base64Image, uploadUrl, filename) {
    // Convert base64 string to a Buffer, removing the Data URI part if present
    const base64Data = base64Image.replace(/^data:([A-Za-z-+/]+);base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Write the buffer to a file
    const filePath = path.join('/tmp', `${filename}`); // Modify with your desired path and filename
    fs.writeFileSync(filePath, buffer);

    // Now you can use the previously provided code to upload the file
    try {
      // Extract the file name
      const filename = path.basename(filePath);
      // Set the headers for a multipart/form-data request
      let these_headers = {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${authToken}`
      };

      // Prepare the form data
      const boundary = `----WebKitFormBoundary${Math.random().toString(16)}`;
      let data = '';
      
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
      fileURL = response.data.url;
    } catch (error) {
      console.error('Failed to upload file:', error.message);
    } finally {
      // Clean up: delete the temporary file
      fs.unlinkSync(filePath);
    }
  }

  function handle_custom(thisObjectId) {
    if (custom != []) {
      for (let i = 0; i < custom.length; i++) {
        let action = custom[i].action;
        let toObjectType = custom[i].objectType;
        let updateId = custom[i].objectId;
        let assocType = custom[i].association;
        let customObjects = custom[i].objects;
        let associations;
        if (action != "update_object") {
          if (action == "associate") {
            associations = [{
              "to": { "id": thisObjectId },
              "types": [{ "associationCategory": "USER_DEFINED", "associationTypeId": assocType }]
            }];
          }
          for (const key in customObjects) {
            if (customObjects.hasOwnProperty(key)) {
              const value = customObjects[key];
              let these_properties = value;
              if (these_properties != {}) {
                let create_response = create_object(toObjectType, these_properties, associations);
                console.log(create_response);
              }
            }
          }
        } else {
          let endpoint = `https://api.hubapi.com/crm/v3/objects/${toObjectType}/${updateId}`;
          for (const key in customObjects) {
            if (customObjects.hasOwnProperty(key)) {
              const value = customObjects[key];
              let these_properties = value;
              if (these_properties != {}) {
                let update_response = updateObject(endpoint, these_properties, headers);
                console.log(update_response);
              }
            }
          }        
        }
      }
    }
  }

  if (objectId != "none") {
    let endpoint = `https://api.hubapi.com/crm/v3/objects/${objectType}/${objectId}`;
    if (properties && properties != {}) {
      let update_response = await updateObject(endpoint, properties, headers)
      .then(function(response) {
        handle_custom(objectId)
      })
      .catch(function(error) {
        console.log(error.message);
        throw error
      });
    } else {
      console.log(objectId);
      handle_custom(objectId);
    }
  } else {
    if (properties && properties != {}) {
      let associations = [];
      let create_response = await create_object(objectType, properties, associations)
      .then(function(response) {
        let newObjectId = response.id;
        handle_custom(newObjectId);
      })
      .catch(function(error) {
        console.log(error.message);
        throw error
      });
    } else {
      console.log(objectId);
      handle_custom(objectId);
    }
  }

}