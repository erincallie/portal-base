$(function() {
  
  let init_answers = function() {
    let answers = $(".survey-answer");
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
        let slider = $(".survey__steps.owl-carousel");
        slider.owlCarousel({
          loop:false,
          margin:10,
          items:1,
          autoplay:false,
          autoHeight:false,
          nav:false,
          dots:false,
          mouseDrag:false,
          touchDrag:false,
          navSpeed:1000
        });
        slider.on('initialized.owl.carousel', function(event) {
          $(".survey").addClass("slider-loaded");
        })
      },
      init_question_slider = function() {
        let slider = $(".survey .step__main.owl-carousel");
        slider.owlCarousel({
          loop:false,
          margin:0,
          items:1,
          autoplay:false,
          nav:true,
          dots:true,
          dotsSpeed:800
        });
        slider.on('initialized.owl.carousel', function(event) {
          $(".survey").addClass("question-loaded");
        });
      },
      get_results = function() {
        let questions = $(".step__question"),
            scores = [];
        questions.each(function() {
          let selected_answer = $(this).find(".survey-answer.selected");
          selected_answer.each(function() {
            let score = parseFloat($(this).attr("data-score"));
            scores.push(score);
          });
        });
        console.log(scores);
      };
  
  init_answers();
  init_step_slider();
  //init_question_slider();
  
  $("#get_results").on("click", function() {
    get_results();
  });
  
  $(".survey-answer").on("click", function() {
    let answer_id = $(this).attr("data-id"),
        question_id = $(this).closest(".survey-question").attr("data-id");
    $(".survey-question").each(function() {
      let dependent_question_id = $(this).attr("data-dq").indexOf(",") > -1 ? $(this).attr("data-dq").split(",") : [$(this).attr("data-dq")],
          dependent_answer_id = $(this).attr("data-da").indexOf(",") > -1 ? $(this).attr("data-da").split(",") : [$(this).attr("data-da")],
          operator = $(this).attr("data-op").indexOf(",") > -1 ? $(this).attr("data-op").split(",") : [$(this).attr("data-op")],
          has_dependents = $(this).attr("data-dq") != "" ? true : false,
          is_true = false;
      if (dependent_question_id != [] && dependent_answer_id != []) {
        for (let i=0; i<dependent_question_id.length; i++) {
          let this_dependent_question_id = dependent_question_id[i],
              this_dependent_answer_id = dependent_answer_id[i],
              this_dependent_operator = operator[i],
              question_el = $(`[data-id='${this_dependent_question_id}']`),
              selected_answer = question_el.find(".selected"),
              answer_el = $(`[data-id='${this_dependent_answer_id}']`);
          if (this_dependent_question_id && this_dependent_answer_id && this_dependent_operator == "eq") {
            if (selected_answer.is(`[data-id='${this_dependent_answer_id}']`)) {
              is_true = true;
            }
          } else if (this_dependent_question_id && this_dependent_answer_id && this_dependent_operator == "neq") {
            if (selected_answer != answer_el) {
              is_true = true;
            }
          }
        }
      }
      if (has_dependents) {
        if (is_true != false) {
          $(this).removeClass("hide");
        } else {
          $(this).addClass("hide");
        }
      } else {
        $(this).removeClass("hide");
      }
    });
  });
  
});