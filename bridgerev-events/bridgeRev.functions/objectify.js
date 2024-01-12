const fs = require('fs');
const axios = require('axios');
const path = require('path');
const authToken = process.env.brAPIkey;

exports.main = async (context, sendResponse) => {

  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };

  const file_headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };

  let custom = context.body.custom;
  let properties = context.body.properties;
  let event_properties = context.body.properties;
  let event_name = context.body.properties.event_name;
  let objectId = context.body.objectId;
  let is_series = properties.repeat == "true" ? true : false;
  let objectType;
  let newObjectId;
  let fileURL;
  
  function unescapeHtml(escapedHtml) {
    return String(escapedHtml)
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }
  
  if (properties.description) {
    let unescape_content = unescapeHtml(properties.description);
    properties.description = unescape_content;
    event_properties.description = unescape_content;
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

      // Prepare the form data
      const boundary = `----WebKitFormBoundary${Math.random().toString(16)}`;
      let data = '';
      
      // Set the headers for a multipart/form-data request
      let these_headers = {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Authorization': `Bearer ${authToken}`
      };

      // Add folderPath as a part of the form-data
      data += `--${boundary}\r\n`;
      data += `Content-Disposition: form-data; name="folderPath"\r\n\r\n`;
      data += `/152492014663\r\n`;
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
 
  async function batchCreateObjects(object, data) {
    let batch_endpoint = `https://api.hubapi.com/crm/v3/objects/${object}/batch/create`;
    try {
      let api_response = await axios.post(batch_endpoint, { "inputs": [data] }, { headers });
    } catch (error) {
      //console.log(error.message);
      throw error
    }
  }

  async function createObject(url, SimplePublicObjectInputForCreate) {
    try {
      if (properties.cover_art_url) {
        let fileUrl = await uploadBase64AsFile(properties.cover_art_url, "https://api.hubapi.com/files/v3/files", properties.event_name);
        properties.cover_art_url = fileUrl
      }
      const { data } = await axios.post(url, SimplePublicObjectInputForCreate, { headers });
      return data
    } catch (error) {
      throw error
    }
  }

  async function createAssociation(endpoint, body, headers) {
    const data = await axios.put(endpoint, body, { headers })
    .then(function(response) {
      //console.log(response);
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
      //console.log(response);
    })
    .catch(function(error) {
      console.log(error.message);
      throw error
    });
  }

  async function searchObjects(type, filters, sorts, props) {
    let limit = 10;
    let start = 0;
    let search_endpoint = `https://api.hubapi.com/crm/v3/objects/${type}/search`;
    let results_object = [];
    let searchOptions = {
      filterGroups: [filters],
      properties: props,
      sorts: sorts,
      limit: limit
    };
    try {
      searchOptions = JSON.stringify(searchOptions);
      let search_response = await axios.post(search_endpoint, searchOptions, { headers });
      let response_results = search_response.data.results[0];
      let this_object_id = response_results ? response_results.id : null;
      console.log(this_object_id);
      return this_object_id
    } catch(error) {
      console.log(error);
      throw error
    }
  }

  let dates = [];
  if (is_series) {
    let recurrence = properties.recurrence;
    let start_date = properties.start_date;
    let end_date = properties.end_date;
    let total_weeks = 0;
    let interval;

    if (recurrence == "Weekly") {
      total_weeks = 24;
      interval = 7; // 1 week
    } else if (recurrence == "Bi-Weekly") {
      total_weeks = 12;
      interval = 14; // 2 weeks
    } else if (recurrence == "Monthly") {
      total_weeks = 6;
      interval = 30; // Approximately 1 month
    } else if (recurrence == "Quarterly") {
      total_weeks = 2;
      interval = 90; // Approximately 3 months
    } else if (recurrence == "Bi-Annually") {
      total_weeks = 1;
      interval = 180; // Approximately 6 months
    }

    let current_date = new Date(start_date);
    let start_day = current_date.getDay(); // Get the day of the week for the start date

    for (let i = 0; i < total_weeks; i++) {
      while (current_date.getDay() !== start_day) {
        current_date.setDate(current_date.getDate() + 1); // Move to the next day until it matches the start day
      }
      dates.push(current_date.toISOString().split('T')[0]);
      current_date.setDate(current_date.getDate() + interval);
    }

  } else {
    objectType = context.body.objectType;
  }

  async function handle_dates(objectId) {
    let create_object_data = {
      properties: event_properties,
      associations: [
        {
          "types": [
            {
              "associationCategory": "USER_DEFINED",
              "associationTypeId": 187
            }
          ],
          "to": {
            "id": objectId
          }
        }
      ]
    };
    delete create_object_data.properties.series_name; 
    create_object_data.properties["event_name"] = event_name;
    for (let x = 0; x < dates.length; x++) { 
      create_object_data.properties["start_date"] = `${dates[x]}`;
      let create_events = await create_object("events", create_object_data.properties, create_object_data.associations);
      //console.log(create_events);
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
                //console.log(create_response);
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
                //console.log(update_response);
              }
            }
          }        
        }
      }
    }
  }

  if (properties.featured_image) {
    let fileUrl = await uploadBase64AsFile(properties.featured_image, "https://api.hubapi.com/files/v3/files", properties.event_name);
    delete properties["featured_image"];
    delete event_properties["featured_image"];
    properties.featured_image = fileUrl
  }
  
  async function handle_calendars(newObjectId) {
    if (properties.calendar_name) {
      let calendar_object_type_id = "2-21714989";
      let calendar_props_to_get = ["hs_object_id"];
      let calendar_filters = {
        "filters": [{
          "propertyName": "calendar_name",
          "operator": "CONTAINS_TOKEN",
          "value": properties.calendar_name
        }]
      };
      let this_id = await searchObjects(calendar_object_type_id, calendar_filters, [], calendar_props_to_get);
      let endpoint = `https://api.hubapi.com/crm/v4/objects/${objectType}/${newObjectId}/associations/${calendar_object_type_id}/${this_id}/`;
      let assocTypeId = "106";
      let body = [ 
        {
          "associationCategory": "USER_DEFINED",
          "associationTypeId": assocTypeId
        }
      ];
      let associate_response = await createAssociation(endpoint, body, headers);
      //console.log(associate_response);
    }
  }
  
  async function handle_speakers(newObjectId) {
    if (properties.speaker) {
      let speaker_object_type_id = "2-21714997";
      let speaker_props_to_get = ["hs_object_id"];
      // Return only contacts with an existing iMIS ID
      let speaker_filters = {
        "filters": [{
          "propertyName": "speaker_name",
          "operator": "CONTAINS_TOKEN",
          "value": properties.speaker
        }]
      };
      let this_id = await searchObjects(speaker_object_type_id, speaker_filters, [], speaker_props_to_get);
      let endpoint = `https://api.hubapi.com/crm/v4/objects/${objectType}/${newObjectId}/associations/${speaker_object_type_id}/${this_id}/`;
      let assocTypeId = "193";
      let body = [ 
        {
          "associationCategory": "USER_DEFINED",
          "associationTypeId": assocTypeId
        }
      ];
      let associate_response = await createAssociation(endpoint, body, headers);
      //console.log(associate_response);
    }
  }
  
  async function handle_series_edits() {
    let endpoint = `https://metal.men/_hcms/api/handleEdits`;
    let this_data = await axios.post(endpoint, properties)
    .then(function(response) {
      console.log(response);
    })
    .catch(function(error) {
      console.log(error.message);
      throw error
    });
  };

  if (objectId != "none") {
    let endpoint = `https://api.hubapi.com/crm/v3/objects/${objectType}/${objectId}`;
    if (properties != {}) {
      
      let update_response = await updateObject(endpoint, properties, headers)
      .then(function(response) {
        handle_custom(objectId);
        handle_speakers(objectId);
        handle_calendars(objectId);
        handle_series_edits(objectId);
      })
      .catch(function(error) {
        console.log(error.message);
        throw error
      });
    }
  } else {
    if (properties != {}) {
      let associations = [];
      if (is_series) {
        objectType = "series";
        properties["series_name"] = properties.event_name;
        let create_response = await create_object(objectType, properties, associations)
        .then(function(response) {
          let newObjectId = response.id;
          handle_custom(newObjectId);
          return newObjectId
        })
        .then(function(id) {
          handle_speakers(id);
          handle_calendars(id);
        })
        .catch(function(error) {
          console.log(error.message);
          throw error
        });
      } else {
        let create_response = await create_object(objectType, properties, associations)
        .then(function(response) {
          let newObjectId = response.id;
          handle_custom(newObjectId);
          return newObjectId
        })
        .then(function(id) {
          handle_speakers(id);
          handle_calendars(id);
        })
        .catch(function(error) {
          console.log(error.message);
          throw error
        });
      }
    }
  }
}