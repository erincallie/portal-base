(function() {
  const init_accordion = function() {
    const items = $(".accordion-item");
    items.each(function() {
      let this_item = $(this),
          title = this_item.find(".accordion-item__title");
      title.on("click", function() {
        this_item.toggleClass("active");
      });
    });
  };
  init_accordion();
})();