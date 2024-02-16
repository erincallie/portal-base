$(function() {
  
  let init_answers = function() {
    let answers = $(".revops-assessment-answer");
    answers.on("click", function() {
      let this_input = $(this).find("input");
      if ($(this).is(".selected")) {
        this_input.attr("checked", false);
        $(this).removeClass("selected");
      } else {
        this_input.attr("checked", true);
        $(this).addClass("selected");
        $(this).siblings().removeClass("selected");
      }
    });
  },
      init_step_slider = function() {
        let slider = $(".revops-assessment__steps.owl-carousel");
        slider.owlCarousel({
          loop:false,
          margin:10,
          items:1,
          autoplay:false,
          autoHeight:false,
          nav:true,
          dots:true,
          mouseDrag:false,
          touchDrag:false,
          navSpeed:1500
        });
        slider.on('initialized.owl.carousel', function(event) {
          $(".revops-assessment").addClass("slider-loaded");
        })
      },
      init_question_slider = function() {
        let slider = $(".revops-assessment .step__main.owl-carousel");
        slider.owlCarousel({
          loop:false,
          margin:0,
          items:1,
          autoplay:false,
          nav:false,
          dots:true,
          dotsSpeed:1000
        });
        slider.on('initialized.owl.carousel', function(event) {
          $(".revops-assessment").addClass("question-loaded");
        });
      },
      get_results = function() {
        let questions = $(".step__question"),
            scores = [];
        questions.each(function() {
          let selected_answer = $(this).find(".revops-assessment-answer.selected");
          selected_answer.each(function() {
            let score = parseFloat($(this).attr("data-score"));
            scores.push(score);
          });
        });
        console.log(scores);
      };
  
  init_answers();
  init_step_slider();
  init_question_slider();
  
  $("#get_results").on("click", function() {
    get_results();
  });
  
  $(".revops-assessment-answer").on("click", function() {
    let active_dot = $(this).closest(".step__inner").find(".owl-dots .active");
    if (active_dot.is(".owl-dot:last-child")) {
      active_dot.closest(".owl-dots").first().trigger("click");
    } else {
      active_dot.next(".owl-dot").trigger("click");
    }
  });
  
});