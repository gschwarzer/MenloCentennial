(function($, global) {
  
  var centennial = {
    contentIsShowing: false, //Set default value for whether the content is showing
    contentHash: global.location.hash.replace('#', '').replace('photo', 'lwid'), //Get the # value from the URL so we can load a specific image directly
    gridHeight: 0,
    velocitySetting: {duration: 500, easing: "easeInOutQuad"},
    
    init: function() {
      this.addPhotoMouseDownAnimation();
      this.setPhotoTileSize();
      this.addPhotoClickAnimation();
      this.addAnalyticsTracking();
      this.addCommentButtonClickSubmission();
      this.addBackButtonClickAnimation();
    },
    addPhotoMouseDownAnimation: function() {
      //Create the photo tile bounce effect on mouse down/up
      $('.photo').mousedown(function() {
        $(this).css({transform: 'scale(0.9)'}).mouseout(function() {
          $(this).css({transform: ''});
        }).mouseup(function() {
          $(this).css({transform: ''});
        });
      });
    },
    setPhotoTileSize: function() {
      var photoWidth = Math.floor(($(global).width() - (($(global).width() * 0.008) * 2)) / 10);
      var photoHeight = Math.floor(photoWidth / 1.85);
      var photoZoomedWidth = Math.floor(photoWidth * 1.2);
      var photoZoomedHeight = Math.floor(photoHeight * 1.2);
      var photoZoomedTopOffset = Math.floor(((photoZoomedHeight - photoHeight) / 2) * -1);
      var photoZoomedLeftOffset = Math.floor(((photoZoomedWidth - photoWidth) / 2) * -1);
    
      //If the custom CSS already exists on the page, remove it
      if ($('#customTileSizeCSS').length > 0) {
        $('#customTileSizeCSS').remove();
      }
      
      //Add some custom CSS with the calculated width/height of the tiles
      $('head').append('<style id="customTileSizeCSS">.panel { width:'+photoWidth+'px; height:'+photoHeight+'px; } .photo { width:'+photoWidth+'px; height:'+photoHeight+'px; } .photo:hover { top: '+photoZoomedTopOffset+'px; left: '+photoZoomedLeftOffset+'px; width:'+photoZoomedWidth+'px; height:'+photoZoomedHeight+'px; }</style>');
      
      //Move the navigation down underneath the grid
      this.gridHeight = (photoHeight * 10);
      $('#grid').css({height: this.gridHeight});
      $('#nav').css({marginTop: (this.gridHeight + 55)});
    },
    addPhotoClickAnimation: function() {
      $('#grid').on('click', '.photo', function() {
        var $clickedPhoto = $(this);
        var clickedPhotoIndex = $('.photo').index($clickedPhoto);
        var clickedPhotoIndexDigitsArray = centennial.returnIndexDigitsArray(clickedPhotoIndex);
        
        //Set the # in the URL
        if (history.replaceState) {
          history.replaceState(null, null, '#photo-'+$clickedPhoto.attr('id').replace('lwid-', ''));
        } else {
          global.location.hash = 'photo-'+$clickedPhoto.attr('id').replace('lwid-', '');
        }
        
        //Track photo click in Google Analytics
        _gaq.push(['_trackEvent', 'Centennial Photos', 'Open', $clickedPhoto.attr('data-filename')]);
                 
        //Fade out the photo that was clicked
        setTimeout(function() {
          $clickedPhoto.css({opacity:0, 'z-index':0});
        }, 150);
        
        //Loop through each photo, starting from the top left of the grid
        $('.photo').each(function(index) {
          var $loopedPhoto = $(this);
          var multiplier, finalDigit1, finalDigit2;
          var loopedPhotoIndexDigitsArray = centennial.returnIndexDigitsArray(index);
          
          //Calculate the multiplier that will allow us to do the ripple effect
          finalDigit1 = Math.abs(clickedPhotoIndexDigitsArray[0] - loopedPhotoIndexDigitsArray[0]);
          finalDigit2 = Math.abs(clickedPhotoIndexDigitsArray[1] - loopedPhotoIndexDigitsArray[1]);
          
          if (finalDigit1 > finalDigit2) {
            multiplier = finalDigit1;
          } else {
            multiplier = finalDigit2;
          }

          if (index != clickedPhotoIndex) {
            if (multiplier == 1) {
              multiplier = 1.8;
            }
            setTimeout(function() {
              $loopedPhoto.css({opacity:0});
            }, multiplier*100);
          }
          
          //Only start loading the AJAX content once we've run through all the photos to ensure smoother animations
          if (index == 99) {
            setTimeout(function() {
              centennial.loadAndFadeInContent($clickedPhoto);
            }, (multiplier+3)*100);
          }
        }).css({'z-index':0});
      });
    },
    returnIndexDigitsArray: function(index) {
      var indexDigitsArray = [];
      var indexString = index.toString();
      
      if (indexString.length == 1) {
        indexString = "0"+indexString;
      }
      
      for (var i=0; i<indexString.length; i++) {
        indexDigitsArray.push(+indexString.charAt(i));
      }
        
      return indexDigitsArray;
    },
    loadAndFadeInContent: function($photo) {
      var imgFile = "/live/image/gid/4/width/1000/"+$photo.attr('data-filename');
      
      //Restart the progress bar
      Pace.restart();
      
      //Once the image file is loaded into the cache
      $.ajax(imgFile).done(function() {
        
        //Stop the progress bar
        Pace.stop();
        
        //Load the rest of the page content
        $('#content').load('landing_page_content.php?ts='+(new Date().getTime()), { photoFilename: $photo.attr('data-filename'), imageId: $photo.attr('data-imageid') }, function() {
          
          //Make sure we only start the animations once the big image is fully loaded into the browser
          var image = new Image();
          
          image.onload = function () {
            setTimeout(function() {
              centennial.contentIsShowing = true;
              
              var $videoSelector = $('#photoLarge iframe');
              
              //Set height of video if there is one
              if ($videoSelector.length>0) {
                $videoSelector.css({height: (Math.round($videoSelector.width() / 1.776))});
              }
              
              var $leftColumnHeight = $('#leftColumn').height();
              var $rightColumnHeight = $('#rightColumn').height();
              
              //Set the grid and comment heights, as well as the position of the navigation, depending on screen width
              if (Modernizr.mq('(max-width: 1024px)')) {
                $('#grid').velocity({
                  height: ($leftColumnHeight + $rightColumnHeight + 25)
                }, centennial.velocitySetting);
                $('#nav').velocity({
                  marginTop: ($leftColumnHeight + $rightColumnHeight + 80)
                }, centennial.velocitySetting);
              } else {
                $('#comments').css({height: ($leftColumnHeight - $('#social').height() - 50)+'px'});
                $('#grid').velocity({
                  height: ($leftColumnHeight + 25)
                }, centennial.velocitySetting);
                $('#nav').velocity({
                  marginTop: ($leftColumnHeight + 80)
                }, centennial.velocitySetting);
              }
              
            }, 200);
            
            //Fade in the content and scroll to the top of it
            setTimeout(function() {
              $('#content').velocity({
                opacity: 1
              }, centennial.velocitySetting).velocity("scroll", {
                offset: "-20px", 
                mobileHA: false 
              });
            }, 400);
            
            //Fade in the back button
            setTimeout(function() {
              $('#backButton').velocity({
                opacity: 1
              }, centennial.velocitySetting);
            }, 800);
          }
          image.src = imgFile;
        });
      });
    },
    addAnalyticsTracking: function() {
      //Track in Google Analytics when the Facebook button is clicked
      $('#content').on('click', '#fb_share', function() {
        _gaq.push(['_trackEvent', 'Centennial Sharing', 'Click', 'Facebook']);
      });
      
      //Track in Google Analytics when the Twitter button is clicked
      $('#content').on('click', '#tw_share', function() {
        _gaq.push(['_trackEvent', 'Centennial Sharing', 'Click', 'Twitter']);
      });
    },
    addCommentButtonClickSubmission: function() {
      $('#content').on('click', '#commentSubmit', function() {
        if ($('#commentName').val() == '') {
          alert('Please provide your name.');
        
        } else if ($('#commentText').val() == '') {
          alert('Please provide a comment.');
        
        } else {
          if ($('#spamcheck').val() == '') {
            $.post('/centennial/save_comment.php', {
              commentImageId: $('#commentImageId').val(),
              commentName: $('#commentName').val(),
              commentClass: $('#commentClass').val(),
              commentText: $('#commentText').val(),
              commentEmail: $('#commentEmail').val()
            }).done(function(){
              $('#commentForm .success').velocity("scroll", {
                container: $('#comments'),
                offset: "-60px", 
                mobileHA: false 
              }).fadeIn();
              $('#commentName, #commentClass, #commentText, #commentEmail').val('');
            });
          }
        }
      });
    },
    addBackButtonClickAnimation: function() {
      $('#backButton a').on('click touchstart', function(e) {
        e.preventDefault();
        
        //Clear the # in the URL
        if (history.replaceState) {
          history.replaceState(null, null, global.location.pathname + global.location.search);
        } else {
          global.location.hash = 'all';
        }
        
        centennial.contentIsShowing = false;
        
        //Fade out the back button and the content
        $('#backButton, #content').velocity({
          opacity: 0
        }, {
          duration: 500, 
          easing: "easeInOutQuad",
          complete: function() {
            //Set the grid height and navigation position back to its original values
            $('#grid').velocity({
              height: centennial.gridHeight
            }, centennial.velocitySetting);
            
            $('#nav').velocity({
              marginTop: (centennial.gridHeight + 55)
            }, centennial.velocitySetting);
            
            //Fade in each photo again, one after the other
            $('.photo').each(function(index, value) {
              var $el = $(this);
              setTimeout(function() {
                $el.css({opacity:1});
              }, index*5);
            }).css({'z-index':''});
          } 
        });
      });
    }
  };
  
  
  //Set everything up for display
  centennial.init();
  
  
  //Window load event listener
  $(global).on('load', function() {
    //Fade into the photo grid after 200ms
    setTimeout(function() {
      $('#cover').velocity({
        opacity: 0
      }, {
        duration: 1000, 
        easing: 'easeInOutQuad', 
        complete: function() {
          $('#cover').remove();
        }
      });
      
      //If the URL includes a #, trigger a click on the corresponding photo
      if (centennial.contentHash != '') {
        $('#'+centennial.contentHash).trigger('click');
      }
    }, 200);
  });
  
  
  //Window resize event listener
  $(global).on('resize', function() {
    //Resize the photos
    centennial.setPhotoTileSize();
    
    //Resize the content screen if it's showing
    if (centennial.contentIsShowing) {
      var $videoSelector = $('#photoLarge iframe');
      
      //Set height of video if there is one
      if ($videoSelector.length>0) {
        $videoSelector.css({height: (Math.round($videoSelector.width() / 1.776))});
      }
      
      var $leftColumnHeight = $('#leftColumn').height();
      var $rightColumnHeight = $('#rightColumn').height();
      
      //Set the height of the grid and comments, as well as the position of the navigation, depending on screen width
      if (Modernizr.mq('(max-width: 1024px)')) {
        $('#grid').css({height: ($leftColumnHeight + $rightColumnHeight + 25)});
        $('#nav').css({marginTop: ($leftColumnHeight + $rightColumnHeight + 80)});
        $('#comments').css({height: 'auto'});
      } else {
        $('#grid').css({height: ($leftColumnHeight + 25)});
        $('#nav').css({marginTop: ($leftColumnHeight + 80)});
        $('#comments').css({height: ($leftColumnHeight - $('#social').height() - 50)});
      }
    }
  });
  
})(jQuery, window);


//Google Analytics
var _gaq = _gaq || [];
_gaq.push(["_setAccount", "YOUR-ACCOUNT-ID-HERE"], ["_trackPageview"]);
(function() {
  var ga = document.createElement("script");
  ga.type = "text/javascript";
  ga.async = true;
  ga.src = ("https:" == document.location.protocol ? "https://ssl":"http://www") + ".google-analytics.com/ga.js";
  var s = document.getElementsByTagName("script")[0];
  s.parentNode.insertBefore(ga,s);
})();