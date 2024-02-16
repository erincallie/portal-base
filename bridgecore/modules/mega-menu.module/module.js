$(function() {
  const init_search = function() {
    let trigger = $(".mega-search__trigger"),
        target = $(".mega-search");
    trigger.on("click", function() {
      if (target.is(".active")) {
        target.removeClass("active");
        $("body").removeClass("freeze-scroll");
      } else {
        target.addClass("active");
        $("body").addClass("freeze-scroll");
      }
    });
  },
        init_toggle_mobile_menu = function() {
          let toggle_open = $(".mega-menu--toggle.toggle--open"),
              toggle_close = $(".mega-menu--toggle.toggle--close");
          toggle_open.on("click", function() {
            $(".mega-menu").addClass("active");
          });
          toggle_close.on("click", function() {
            $(".mega-menu").removeClass("active");
          });
        },
        init_mega_menu = function() {
          let mega_menu = $(".mega-menu"),
              primary_nav_items = mega_menu.find(".hs-menu-wrapper > ul > .hs-menu-depth-1.hs-item-has-children");
          primary_nav_items.each(function() {
            let number_with_children = $(this).find(".hs-menu-depth-2.hs-item-has-children").length;
            $(this).find("a").after("<span class='submenu-trigger'></span>");
            if (number_with_children > 0) {
              $(this).addClass("item--mega");
            } else {
              $(this).addClass("item--dropdown");
            }
          });
        };
  init_mega_menu();
  init_search();
  init_toggle_mobile_menu();
  $(document).on("click", ".submenu-trigger", function(e) {
    e.preventDefault();
    $(this).parent().toggleClass("active");
  });
});