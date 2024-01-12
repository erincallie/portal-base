const axios = require('axios');
const authToken = process.env.brAPIkey;

exports.main = async (context, sendResponse) => {
  
  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };

  async function fetchData(endpoint, list_id) {
    try {
      const response = await axios.get(endpoint, { headers });
      let this_object = [],
          all_ids = response.data.contacts.map(contact => contact.vid);
      for (let i=0; i<all_ids.length; i++) {
        let push_this = { "properties": { "membership_lists": list_id }, "id": all_ids[i] };
        this_object.push(push_this);
      }
      return this_object
    } catch (error) {
      console.log(error.message);
      throw error; // It's usually better to throw the error so the caller can handle it
    }
  }

  async function postData(endpoint, data) {
    try {
      const response = await axios.post(endpoint, { "inputs": data }, { headers });
      return response;
    } catch (error) {
      console.log(error.message);
      throw error;
    }
  }

  async function getHubDBData(tableId) {
    const endpoint = `https://api.hubapi.com/hubdb/api/v2/tables/${tableId}/rows`;
    try {
      const response = await axios.get(endpoint, { headers });
      return response.data.objects;
    } catch (error) {
      console.error('Error fetching data from HubDB:', error.message);
      throw error;
    }
  }

  function combineObjects(array) {
    const combinedArray = [];
    const map = new Map();
    array.forEach((item) => {
      let id = item.id;
      let membership_lists = item.properties.membership_lists;
      if (map.has(id)) {
        const existingItem = map.get(id);
        existingItem.membership_lists += `,${membership_lists}`;
      } else {
        map.set(id, item);
      }
    });
    combinedArray.push(...map.values());
    return combinedArray;
  }

  async function handleListContacts(list_id) {
    let membership_lists_endpoint = `https://api.hubapi.com/contacts/v1/lists/${list_id}/contacts/all`;
    let these_contacts = await fetchData(membership_lists_endpoint, list_id);
    return these_contacts
  }

  let final_result;
  async function processContacts() {
    try {
      let data = await getHubDBData(11338529);
      const all_rows = data,
            all_contacts = [],
            list_array = [];

      for (let row of all_rows) {
        let list_id = row.values['2'];
        if (list_id && list_id.indexOf(",") > -1) {
          list_array.push(...list_id.split(","));
        } else if (list_id) {
          list_array.push(list_id);
        }
      }

      const contactPromises = list_array.map(list_id => handleListContacts(list_id));
      const contactsResults = await Promise.all(contactPromises);

      contactsResults.forEach(contactResult => {
        contactResult.forEach(contact => {
          all_contacts.push(contact);
        });
      });
      
      final_result = combineObjects(all_contacts);
      // Now you have all_contacts filled with the results
      return final_result;

    } catch (error) {
      console.error('Error processing contacts:', error.message);
    }
  }

  // Call processContacts to start the whole process
  processContacts().then(all_contacts => {
    console.log('All contacts processed:', all_contacts);
    let batch_update_endpoint = `https://api.hubapi.com/crm/v3/objects/contacts/batch/update`;
    let update_response = postData(batch_update_endpoint, final_result);
    console.log(update_response);
  }).catch(error => {
    console.error('An error occurred:', error.message);
  });

  
  
}
