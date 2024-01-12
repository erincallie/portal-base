$(function() {
  
  let init_share = function(e) {
        let platform = $(e.currentTarget).attr("data-platform"),
            link = $(e.currentTarget).closest(".share-popup").attr("data-link"),
            event_string = link.split("#"),
            event = "#" + event_string[event_string.length - 1],
            page_title = $(event).find("h3").text(),
            urls = {
              "facebook": 'https://www.facebook.com/sharer/sharer.php?' + link,
              "twitter": 'https://twitter.com/intent/tweet?text=' + link,
              "linkedin": "",
              "whatsapp": "whatsapp://send?text=" + page_title + "%20" + link,
              "mail": "mailto:?subject=%22" + page_title + "%22&body=Read%20the%20article%20%22" + page_title + "%22%20on%20" + link
            };
         window.open(urls[platform] , '_blank');
      },
      build_payload = function(type, e) {
        let contact_id =  $(".events").attr("data-contact"),
            payload = {"objectType": "0-1", "objectId": contact_id, "properties":{}, "associations": [], "options:": {}},
            current_muted = $(".events").attr("data-muted"),
            current_saved = $(".events").attr("data-saved"),
            current_registered = $(".events").attr("data-registered"),
            this_event = $(e.target).closest(".event-card").attr("data-id");
        if (type == "mute") {
          let updated = current_muted ? current_muted + "," + this_event : this_event;
          payload["properties"] = {
            "muted_events": `${updated}`
          }
        } else if (type == "save") {
          let updated = current_saved ? current_saved + "," + this_event : this_event;
          payload["properties"] = {
            "saved_events": `${updated}`
          }
           $(e.target).closest(".event-card").addClass("yours");
        } else if (type == "unsave") {
          let updated = current_saved.replace(this_event, "").replace(/,{2,}/g, ',');
          payload["properties"] = {
            "saved_events": `${updated}`
          }
           $(e.target).closest(".event-card").removeClass("yours");
        } else if (type == "going") {
          let updated = current_registered ? current_registered + "," + this_event : this_event;
          payload["properties"] = {
            "registered_event_ids": `${updated}`
          }
          payload.options = {
            action: "create",
            fromObjectType: "0-1",
            fromObjectId: contact_id,
            toObjectType: "2-21227207",
            toObjectId: this_event,
            assocTypeId: "59"
          };
          $(e.target).closest(".event-card").addClass("yours");
        } else if (type == "not_going") {
          let updated = current_registered.replace(this_event, "").replace(/,{2,}/g, ',');
          payload["properties"] = {
            "registered_event_ids": `${updated}`
          }
          payload.options = {
            action: "delete",
            fromObjectType: "0-1",
            fromObjectId: contact_id,
            toObjectType: "2-21227207",
            toObjectId: this_event,
            assocTypeId: "59"
          };
          $(e.target).closest(".event-card").removeClass("yours");
        }
        return payload
      },
      send_to_serverless = function(object) {
        let endpoint = "https://metal.men/_hcms/api/handleActions";
        var submit_this = JSON.stringify(object);
        var response = fetch(endpoint, {
          method: 'POST',
          body: submit_this,
          headers: {
            "Content-Type": "application/json"
          }
        });
        console.log(submit_this);
        return response;
      };
  
  $("[data-action='share']").on("click", function() {
    let share_popup = "#share_popup",
        closest_event = $(this).closest(".event-card").find(".trigger-details").attr("data-target"),
        full_link = "https://metal.men/events-beta?event=" + closest_event;
    $(share_popup).attr("data-link", full_link);
    lity("#share_popup");
  });
  
  $(".events [data-action]:not([data-action='share'])").on("click", function(e) {
    let action = $(this).attr("data-action");
    let payload = build_payload(action, e);
    let response = send_to_serverless(payload);
    console.log(payload);
  });
  
  $(".share-popup a").on("click", function(e) {
    init_share(e);
  });
  
  let selector_lity;
  $("a[href^='#lity--']").on("click", function(e) {
    e.preventDefault();
    console.log(e);
    let target = $(this).attr("href").replace("lity--", ""),
        object_id = $(this).attr("data-id"),
        this_action = $(this).attr("data-action"),
        object_type = $(this).attr("data-object-id");
    if (target.indexOf("__selector") > -1) {
      $(target).attr("data-action", this_action);
      selector_lity = lity(target);
    } else {
      lity(target);
      selector_lity.close();
    }
    $(target).attr("data-object-id", object_id);
    if (object_type) {
      $(target).attr("data-object", object_type);
    }
  });
  
  $("[data-action='see-all']").on("click", function(e) {
    $(this).closest(".active").removeClass("active");
    $("body").removeClass("noscroll");
  });
  
  function handle_search(object) {
    let search_query = encodeURIComponent(object.closest(".custom-search").find("input").val());
    window.location.href = `https://metal.men/events-beta?search=${search_query}`;
  };
  
  $('.custom-search svg').on("click", function() {
    handle_search($(this));
  });
  
  $(".custom-search input").keypress(function(event) {
    if (event.which === 13) {
      handle_search($(this));
    }
  });
  
          
  let guest_trigger = $("a[href='#guest']");
  guest_trigger.on("click", function(e) {
    e.preventDefault();
    $.cookie('is_guest', "true");
  });


  
});