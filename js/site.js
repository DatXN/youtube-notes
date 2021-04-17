var $view;
var ytApiReady = false;
var pageInitialized = false;
(function () {
  "use strict";
  var model = (function () {
    var _pageData;
    function hasPageData() {
      return (
        !!_pageData && (!!_pageData.video.VideoId || !!_pageData.notes > 0)
      );
    }
    function resetPageData(ignoreLoadPageData) {
      _pageData.video = {};
      _pageData.notes = {};
      savePageData();
      if (!!ignoreLoadPageData == false) {
        loadPageData();
      }
    }
    function loadPageData() {
      _pageData = JSON.parse(
        localStorage.getItem("datxn_yt_note_v1_page_data")
      );
      if (hasPageData()) {
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
      notes.onChanged(true);
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
      var subscribedFns = [];

      function saveNotes(keyTime, valueNote) {
        // Update or Add new
        _pageData.notes[keyTime] = valueNote;
        // Sort
        const ordered = Object.keys(_pageData.notes)
          .sort()
          .reverse()
          .reduce((obj, key) => {
            obj[key] = _pageData.notes[key];
            return obj;
          }, {});
        _pageData.notes = ordered;
        onChanged();
      }
      function deleteNote(keyTime) {
        delete _pageData.notes[keyTime];
        onChanged();
      }
      function getNotes() {
        return _pageData.notes;
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
        subscribe: subscribe,
        onChanged: onChanged,
        saveNotes: saveNotes,
        getNotes: getNotes,
        deleteNote: deleteNote,
      };
      return publicInterface;
    })();
    var publicInterface = {
      video: video,
      notes: notes,
      loadPageData: loadPageData,
      hasPageData: hasPageData,
      resetPageData: resetPageData,
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
        BTN_SAVE_NOTE: "#btnSaveNote",
        BTN_CLEAR_NOTE: "#btnClearNote",
        TXT_NOTE: "#txtNote",
        INP_NOTE_TIME: "#inpNoteTime",
        GRID_NOTES: "#gridNotes",
        PNL_PREVIEW_ONE: "#panelPreviewOne",
        BTN_EXPORT_FULL_HTML: "#btnExportFullHtml",
        BTN_ADD_NOTE: "#btnAddNotes",
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
      $btnSaveNote: $(constantOfView.IDS.BTN_SAVE_NOTE),
      $btnClearNote: $(constantOfView.IDS.BTN_CLEAR_NOTE),
      $txtNote: $(constantOfView.IDS.TXT_NOTE),
      $inpNoteTime: $(constantOfView.IDS.INP_NOTE_TIME),
      $gridNotes: $(constantOfView.IDS.GRID_NOTES),
      $panelPreviewOne: $(constantOfView.IDS.PNL_PREVIEW_ONE),
      $btnExportFullHtml: $(constantOfView.IDS.BTN_EXPORT_FULL_HTML),
      $btnAddNote: $(constantOfView.IDS.BTN_ADD_NOTE),
    };
    //#endregion
    //#region View Modules
    var pageHandler = (function () {
      // Init
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
      function convertToSecValue(keyTime) {
        var values = keyTime.split(":");
        return (
          parseInt(values[0]) * 3600 +
          parseInt(values[1]) * 60 +
          parseInt(values[2])
        );
      }
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
        hotkeys(
          "ctrl+1,ctrl+2,ctrl+3,ctrl+enter, ctrl+n",
          function (event, handler) {
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
              case "ctrl+enter":
                saveNotes();
                break;
              case "ctrl+n":
                beginAddNewNotes();
                break;

              default:
                console.log(event);
            }
          }
        );
      }
      function clearEditPanel() {
        pageControls.$inpNoteTime.val("");
        pageControls.$txtNote.val("");
      }
      function onNotesDataChanged() {
        clearEditPanel();
        console.log(model.notes.getNotes());
        showNotesGrid();
        showNotesPreview();
      }
      function showNotesGrid() {
        pageControls.$gridNotes.find("tr:gt(0)").remove();
        var i = 1;
        for (const [key, value] of Object.entries(model.notes.getNotes())) {
          var $newRow = $("<tr id='row" + i + "'></tr>").append(
            "<th scope='row'>" +
              key +
              "</th>" +
              "<td colspan='4' style='white-space: pre-line;'>" +
              value +
              "</td>" +
              "<td>" +
              "<button type='button' class='dx-btn-edit-note btn btn-outline-secondary btn-sm'>" +
              "<i class='bi-pencil'></i>" +
              "</button> " +
              "<button type='button' class='dx-btn-del-note btn btn-outline-secondary btn-sm'>" +
              "<i class='bi-trash'></i>" +
              "</button>" +
              "</td>"
          );
          pageControls.$gridNotes.append($newRow);
        }
      }
      function showNotesPreview() {
        pageControls.$panelPreviewOne.html("");
        var $newUl = $("<ul/>");
        for (const [key, value] of Object.entries(model.notes.getNotes())) {
          $newUl.append(
            "<li class='mt-3'><div class='row'><div class='col-2'><a href='https://youtu.be/" +
              model.video.getVideoId() +
              "?t=" +
              convertToSecValue(key) +
              "'>" +
              key +
              "</a></div><div class='col-10' style='white-space: pre-line;'>" +
              value +
              "</div></div></li>"
          );
        }
        pageControls.$panelPreviewOne.append($newUl);
      }
      function CopyToClipboard(element) {
        var doc = document,
          text = doc.getElementById(element),
          range,
          selection;

        if (doc.body.createTextRange) {
          range = doc.body.createTextRange();
          range.moveToElementText(text);
          range.select();
        } else if (window.getSelection) {
          selection = window.getSelection();
          range = doc.createRange();
          range.selectNodeContents(text);
          selection.removeAllRanges();
          selection.addRange(range);
        }
        document.execCommand("copy");
        window.getSelection().removeAllRanges();
      }

      function InitEditPanel() {
        model.notes.subscribe(onNotesDataChanged);
        pageControls.$inpNoteTime.inputmask({ mask: "99:99:99" }); //specifying options;
      }
      function Initialize() {
        InitYTPlayer();
        InitHotKeys();
        InitEditPanel();
      }
      function saveNotes() {
        model.notes.saveNotes(
          pageControls.$inpNoteTime.val(),
          pageControls.$txtNote.val()
        );
      }
      function beginAddNewNotes() {
        clearEditPanel();
        if (!!model.video.getVideoId()) {
          var time = pageControls.$ytPlayer.getCurrentTime();
          var newTimeValue = formatTime(time);
          pageControls.$inpNoteTime.val(newTimeValue);
          pageControls.$txtNote.focus();
        } else {
          pageControls.$inpNoteTime.focus();
        }
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
        pageControls.$btnSaveNote.on("click", function (e) {
          e.preventDefault();
          saveNotes();
        });
        pageControls.$btnClearNote.on("click", function (e) {
          e.preventDefault();
          clearEditPanel();
        });
        function beginEdit(keyTime, valueNote) {
          clearEditPanel();
          pageControls.$inpNoteTime.val(keyTime);
          pageControls.$txtNote.val(valueNote);
          pageControls.$ytPlayer.seekTo(convertToSecValue(keyTime), true);
          pageControls.$ytPlayer.playVideo();
        }
        pageControls.$gridNotes.on("click", ".dx-btn-edit-note", function (e) {
          e.preventDefault();
          var keyTime = getKeyTime($(e.currentTarget));
          var valueNote = getValueNote($(e.currentTarget));
          beginEdit(keyTime, valueNote);
        });
        pageControls.$gridNotes.on("click", ".dx-btn-del-note", function (e) {
          e.preventDefault();
          var keyTime = getKeyTime($(e.currentTarget));
          model.notes.deleteNote(keyTime);
        });
        var clipboard = new ClipboardJS(".btnExportFullHtml");

        clipboard.on("success", function (e) {
          console.info("Action:", e.action);
          console.info("Text:", e.text);
          console.info("Trigger:", e.trigger);

          e.clearSelection();
        });

        clipboard.on("error", function (e) {
          console.error("Action:", e.action);
          console.error("Trigger:", e.trigger);
        });

        pageControls.$btnAddNote.on("click", function (e) {
          e.preventDefault();
          beginAddNewNotes();
        });
      }
      function getKeyTime($target) {
        return $($target).parents("tr").first().find("th").html();
      }
      function getValueNote($target) {
        return $($target).parents("tr").first().find("td").first().html();
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
