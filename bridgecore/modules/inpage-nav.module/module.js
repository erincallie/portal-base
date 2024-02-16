$(function() {
  const init_sticky = function() {
    let sticky_row = $(".inpage-nav.sticky"),
        closest_section = sticky_row.closest(".dnd-section");
    closest_section.addClass("sticky-section");
  };
  init_sticky();
});