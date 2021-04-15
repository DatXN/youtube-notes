var $view;
var ytApiReady = false;
var pageInitialized = false;
(function () {
  "use strict";
  var model = (function () {
    var _pageData;

    function loadPageData() {
      _pageData = JSON.parse(
        localStorage.getItem("datxn_yt_note_v1_page_data")
      );
      if (!!_pageData && !!_pageData.video.VideoId) {
        onChangedPageData();
      } else {
        _pageData = {
          video: {},
          notes: {},
        };
      }
    }
    function savePageData() {
      localStorage.setItem(
        "datxn_yt_note_v1_page_data",
        JSON.stringify(_pageData)
      );
    }
    function onChangedPageData() {
      video.onChanged(true);
    }
    var video = (function () {
      var subscribedFns = [];

      function setVideoId(videoId) {
        _pageData.video.VideoId = videoId;
        onChanged();
      }
      function getVideoId() {
        return _pageData.video.VideoId;
      }
      function onChanged(ignoreSave) {
        if (!!ignoreSave == false) {
          savePageData();
        }
        for (var i = 0; i < subscribedFns.length; i++) {
          subscribedFns[i]();
        }
      }

      function subscribe(callbackFn) {
        subscribedFns.push(callbackFn);
      }
      var publicInterface = {
        setVideoId: setVideoId,
        getVideoId: getVideoId,
        subscribe: subscribe,
        onChanged: onChanged,
      };
      return publicInterface;
    })();
    var notes = (function () {
      var publicInterface = {};
    })();
    var publicInterface = {
      video: video,
      notes: notes,
      loadPageData: loadPageData,
    };
    return publicInterface;
  })();
  var controller = (function () {
    var publicInterface = {};
    return publicInterface;
  })();
  var view = (function () {
    //#region Variables
    var constantOfView = {
      IDS: {
        YT_PLAYER: "ytPlayer",
        YT_PLAYER_TIME: "#ytPlayerTime",
        BTN_LOAD_VIDEO: "#btnLoadVideo",
        INP_VIDEO_ID: "#inpVideoId",
        BTN_PREVIOUS_PAUSE: "#btnPreviousPause",
        BTN_BACKWARD: "#btnBackward",
        BTN_PLAY: "#btnPlay",
        BTN_FORWARD: "#btnForward",
        BTN_NEXT_PAUSE: "#btnNextPause",
      },
    };
    var pageControls = {
      $ytPlayer: null,
      $btnLoadVideo: $(constantOfView.IDS.BTN_LOAD_VIDEO),
      $inpVideoId: $(constantOfView.IDS.INP_VIDEO_ID),
      $ytPlayerTime: $(constantOfView.IDS.YT_PLAYER_TIME),
      $btnPreviousPause: $(constantOfView.IDS.BTN_PREVIOUS_PAUSE),
      $btnBackward: $(constantOfView.IDS.BTN_BACKWARD),
      $btnPlay: $(constantOfView.IDS.BTN_PLAY),
      $btnForward: $(constantOfView.IDS.BTN_FORWARD),
      $btnNextPause: $(constantOfView.IDS.BTN_NEXT_PAUSE),
    };
    //#endregion
    //#region View Modules
    var pageHandler = (function () {
      // Init
      function InitYTPlayer() {
        pageControls.$ytPlayer = new YT.Player(constantOfView.IDS.YT_PLAYER, {
          width: "100%",
          videoId: "",
          events: {
            onReady: onPlayerReady,
            onStateChange: onPlayerStateChange,
          },
        });
        var handle;
        function onPlayerStateChange(event) {
          showTime();
          if (event.data == YT.PlayerState.PLAYING) {
            pageControls.$ytPlayerTime.removeClass("badge-secondary");
            pageControls.$ytPlayerTime.addClass("badge-danger");
            pageControls.$btnPlay
              .find("i")
              .removeClass()
              .addClass("bi-pause-fill");
            handle = setInterval(showTime, 250);
          } else {
            pageControls.$ytPlayerTime.addClass("badge-secondary");
            pageControls.$ytPlayerTime.removeClass("badge-danger");
            pageControls.$btnPlay
              .find("i")
              .removeClass()
              .addClass("bi-play-fill");
            // When you want to cancel it:
            clearInterval(handle);
            handle = 0; // I just do this so I know I've cleared the interval
          }
        }
        function showTime() {
          var time = pageControls.$ytPlayer.getCurrentTime();
          var newTimeValue = formatTime(time);
          if (pageControls.$ytPlayerTime.text() != newTimeValue)
            pageControls.$ytPlayerTime.text(newTimeValue);
        }
        function formatTime(time) {
          var sec_num = parseInt(time, 10);
          var hours = Math.floor(sec_num / 3600);
          var minutes = Math.floor((sec_num - hours * 3600) / 60);
          var seconds = sec_num - hours * 3600 - minutes * 60;
          if (hours < 10) hours = "0" + hours;
          if (minutes < 10) minutes = "0" + minutes;
          if (seconds < 10) seconds = "0" + seconds;
          return hours + ":" + minutes + ":" + seconds;
        }

        // 4. The API will call this function when the video player is ready.
        function onPlayerReady(event) {
          model.loadPageData();
        }
        function onVideoModelChange() {
          pageControls.$ytPlayer.loadVideoById(model.video.getVideoId());
          pageControls.$inpVideoId.val(model.video.getVideoId());
        }
        model.video.subscribe(onVideoModelChange);
      }
      function playPauseVideo() {
        if (pageControls.$ytPlayer.getPlayerState() == YT.PlayerState.PLAYING) {
          pageControls.$ytPlayer.pauseVideo();
        } else {
          pageControls.$ytPlayer.playVideo();
        }
      }
      function playForwardVideo() {
        pageControls.$ytPlayer.seekTo(
          pageControls.$ytPlayer.getCurrentTime() + 5,
          true
        );
      }
      function playBackwardVideo() {
        pageControls.$ytPlayer.seekTo(
          pageControls.$ytPlayer.getCurrentTime() - 5,
          true
        );
      }

      function InitHotKeys() {
        hotkeys.filter = function (event) {
          // Allow to use anywhere
          return true;
        };
        hotkeys("ctrl+1,ctrl+2,ctrl+3", function (event, handler) {
          //avoid recognize special char inside inputs, text areas
          switch (handler.key) {
            case "ctrl+2":
              playPauseVideo();
              break;
            case "ctrl+3":
              playForwardVideo();
              break;
            case "ctrl+1":
              playBackwardVideo();
              break;
            case "alt+a":
              jumpToPreviousPausePoint();
              break;
            case "alt+s":
              noteVideo();
              break;
            case "alt+d":
              jumpToNextPausePoint();
              break;
            default:
              console.log(event);
          }
        });
      }
      function Initialize() {
        InitYTPlayer();
        InitHotKeys();
      }

      // Events
      function RegisterEvents() {
        pageControls.$btnLoadVideo.on("click", function (e) {
          e.preventDefault();
          model.video.setVideoId(pageControls.$inpVideoId.val());
        });
        pageControls.$btnPlay.on("click", function (e) {
          e.preventDefault();
          playPauseVideo();
        });
        pageControls.$btnForward.on("click", function (e) {
          e.preventDefault();
          playForwardVideo();
        });
        pageControls.$btnBackward.on("click", function (e) {
          e.preventDefault();
          playBackwardVideo();
        });
      }
      //
      function Init() {
        Initialize();
        RegisterEvents();
      }
      var publicInterface = {
        Init: Init,
      };
      return publicInterface;
    })();

    //#endregion
    function InitPage() {
      pageHandler.Init();
    }
    var publicInterface = {
      InitPage: InitPage,
    };
    return publicInterface;
  })();
  $view = view;
  if (ytApiReady && !pageInitialized) {
    InitPage();
  }
})();

function onYouTubeIframeAPIReady() {
  ytApiReady = true;
  if ($view != null && !pageInitialized) {
    InitPage();
  }
}
function InitPage() {
  try {
    $view.InitPage();
    pageInitialized = true;
  } catch (err) {
    throw err;
  }
}
