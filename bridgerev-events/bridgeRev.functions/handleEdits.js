const axios = require('axios');
const authToken = process.env.brAPIkey;

exports.main = async (context, sendResponse) => {

  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };

  let custom = context.body.custom;
  let properties = context.body.properties;
  let series_id;

  function unescapeHtml(escapedHtml) {
    return String(escapedHtml)
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
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

  let dates = [];
  let recurrence = properties.recurrence;
  let start_date = new Date(properties.start_date);
  let end_date = new Date(properties.end_date);
  let total_weeks = 0;
  let interval;
  
  function weeksBetweenDates(date1, date2) {
    const millisecondsPerWeek = 1000 * 60 * 60 * 24 * 7;
    const differenceInMilliseconds = Math.abs(date2 - date1);
    const weeks = Math.round(differenceInMilliseconds / millisecondsPerWeek);
    return weeks;
  }
  
  function calculateDaysInPeriods(numWeeks) {
    const biWeeklyDays = numWeeks * 14;
    const monthlyDays = numWeeks * 30.44;
    const quarterlyDays = numWeeks * 91;
    const annuallyDays = numWeeks * 365;

    return {
      biWeeklyDays,
      monthlyDays,
      quarterlyDays,
      annuallyDays
    };
  }

  async function getObjects(endpoint) {
    let full_response = [];
    try {
      let response = await axios({
        method: 'get',
        headers: headers,
        url: endpoint
      });
      full_response.concat(response);
      if (response.data.paging.next.link) {
        let next_endpoint = response.data.paging.next.link;
        let next_response = await getObjects(next_endpoint);
        full_response.concat(next_response);
      }
      return response
    } catch (error) {
      console.error(error.message);
      throw error
    }
  }

  let matchingObjects;
  let filters = [
    {
      filters: [
        {
          value: series_id,
          propertyName: "associated_series",
          operator: "EQ"
        }
      ]
    }
  ],
      sorts = [
        {
          propertyName: "start_date",
          direction: "ASCENDING"
        }
      ],
      properties = [
        "hs_object_id",
        "start_date"
      ];

  let full_response = [];
  async function searchHS(object, filters, sorts, properties, propertiesWithHistory) {
    const searchData = {
      filterGroups: filters,
      sorts: sorts,
      properties: properties,
      propertiesWithHistory: propertiesWithHistory,
      limit: 100,
      after: 0
    };
    await axios.post(`https://api.hubapi.com/crm/v3/objects/${object}/search`, JSON.stringify(searchData), { headers })
      .then(response => {
      let results = response.data.results;
      full_response.concat(results);
      if (response.data.paging.next.link) {
        let next_endpoint = response.data.paging.next.link;
        let next_response = await searchHS(next_endpoint);
        full_response.concat(next_response);
      }
      return full_response
    })
      .catch(err => {
      console.log(err)
      throw err
    })
  }
  
  total_weeks = weeksBetweenDates(start_date, end_date);
  interval = calculateDaysInPeriods(total_weeks);

  let searchResults = await searchHS("events", filters, sorts, properties, []);

  let objectType = "events"; 
  let props_to_get = ["hs_object_id"];
  let prop_string = props_to_get.join("&properties=");
  let endpoint = `https://api.hubapi.com/crm/v3/objects/${objectType}?properties=${prop_string}`;
  let all_events = await getObjects(endpoint);

  for (let i=0; i<searchResults.length; i++) {
    let this_event = searchResults[i];
    let this_id = this_event.id;
    let endpoint = `https://api.hubapi.com/crm/v3/objects/events/${this_id}`;
    let current_date = new Date(start_date);
    let start_day = current_date.getDay(); // Get the day of the week for the start date
    for (let i = 0; i < total_weeks; i++) {
      while (current_date.getDay() !== start_day) {
        current_date.setDate(current_date.getDate() + 1); // Move to the next day until it matches the start day
      }
      dates.push(current_date.toISOString().split('T')[0]);
      current_date.setDate(current_date.getDate() + interval);
    }    
    let these_properties = {
      "start_date": current_date,
      "start_time": properties.start_time
    }
    
    let update_events = await updateObject(endpoint, these_properties, headers)
    .then((result) => {
      console.log('Result:', result);
    })
    .catch((error) => {
      console.error('Error:', error.nessage);
    });
  }



}