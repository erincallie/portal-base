$(function() {
  
  let handle_event_clicks = function() {
    const toggle_trigger = [".toggle-active"];
    for (let i=0; i < toggle_trigger.length; i++) {
      $(toggle_trigger[i]).on("click", function() {
        if ($(this).is(".active")) {
          $(this).removeClass("active");
        } else {
          $(this).addClass("active");
        }
      });
    }
  },
      build_payload = function(type, e) {
        let this_id = $(e.target).closest("[class*='__item']").attr("data-id"),
            payload = { "objectType": "0-1", "objectId": "", "properties":{}, "associations": [] };
        if (type == "remove") {
          payload["option"] = "delete";
        }
        return payload
      },
      send_to_serverless = function(object) {
        let endpoint = "https://www-myhomeqb-com.sandbox.hs-sites.com/_hcms/api/actions";
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
  
  $("[data-action]").on("click", function(e) {
    let action = $(this).attr("data-action");
    let payload = build_payload(action, e);
    let response = send_to_serverless(payload);
    console.log(payload);
  });
  
  $("a[href^='#lity--']").on("click", function(e) {
    e.preventDefault();
    let target = $(this).attr("href").replace("lity--", ""),
        object_id = $(this).attr("data-id");
    lity(target);
    $(target).attr("data-object-id", object_id);
  });
  
  function handle_search(object) {
    let search_query = encodeURIComponent(object.closest(".custom-search").find("input").val());
    window.location.href = `https://www.bridgerevtech.com/events?search=${search_query}`;
  };
  $('.custom-search svg').on("click", function() {
    handle_search($(this));
  });
  $(".custom-search input").keypress(function(event) {
    if (event.which === 13) {
      handle_search($(this));
    }
  });

  handle_event_clicks();
  
  $(document).on('click', function(event) {
    const element = $('.toggle-active');
    if (!element.is(event.target) && element.has(event.target).length === 0) {
      element.removeClass('active');
    }
  });

});