var app = angular.module('JukeTubeApp', ['LocalStorageModule']);

// Run

app.run(function () {
  var tag = document.createElement('script');
  tag.src = "http://www.youtube.com/iframe_api";
  var firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
});

// Config

app.config( function ($httpProvider) {
  delete $httpProvider.defaults.headers.common['X-Requested-With'];
});

// Service

app.service('VideosService', ['$window', '$rootScope', '$log', 'localStorageService', function ($window, $rootScope, $log, localStorageService) {

  var service = this;

  var youtube = {
    ready: false,
    player: null,
    playerId: null,
    videoId: null,
    videoTitle: null,
    playerHeight: '480',
    playerWidth: '640',
    state: 'stopped'
  };

  var results = [];
  var upcoming = localStorageService.get('upcoming');
  var history = localStorageService.get('history');

  if (!upcoming) {
      console.log(upcoming);
      localStorageService.add('upcoming', []);
      upcoming = localStorageService.get('upcoming');
  }

  if (!history) {
      console.log(history);
      localStorageService.add('history', [
          {id: 'XKa7Ywiv734', title: '[OFFICIAL HD] Daft Punk - Give Life Back To Music (feat. Nile Rodgers)'}
      ]);
      history = localStorageService.get('history');
  }

  $window.onYouTubeIframeAPIReady = function () {
    $log.info('Youtube API is ready');
    youtube.ready = true;
    service.bindPlayer('placeholder');
    service.loadPlayer();
    $rootScope.$apply();
  };

  function onYoutubeReady (event) {
    $log.info('YouTube Player is ready');
    youtube.player.cueVideoById(history[0].id);
    youtube.videoId = history[0].id;
    youtube.videoTitle = history[0].title;
  }

  function onYoutubeStateChange (event) {
    if (event.data == YT.PlayerState.PLAYING) {
      youtube.state = 'playing';
    } else if (event.data == YT.PlayerState.PAUSED) {
      youtube.state = 'paused';
    } else if (event.data == YT.PlayerState.ENDED) {
      youtube.state = 'ended';
      service.launchPlayer(upcoming[0].id, upcoming[0].title);
      service.archiveVideo(upcoming[0].id, upcoming[0].title);
      service.deleteVideo(upcoming, upcoming[0].id);
    }
    $rootScope.$apply();
  }

  this.bindPlayer = function (elementId) {
    $log.info('Binding to ' + elementId);
    youtube.playerId = elementId;
  };

  this.createPlayer = function () {
    $log.info('Creating a new Youtube player for DOM id ' + youtube.playerId + ' and video ' + youtube.videoId);
    return new YT.Player(youtube.playerId, {
      height: youtube.playerHeight,
      width: youtube.playerWidth,
      playerVars: {
        rel: 0,
        showinfo: 0
      },
      events: {
        'onReady': onYoutubeReady,
        'onStateChange': onYoutubeStateChange
      }
    });
  };

  this.loadPlayer = function () {
    if (youtube.ready && youtube.playerId) {
      if (youtube.player) {
        youtube.player.destroy();
      }
      youtube.player = service.createPlayer();
    }
  };

  this.launchPlayer = function (id, title) {
    youtube.player.loadVideoById(id);
    youtube.videoId = id;
    youtube.videoTitle = title;
    return youtube;
  }

  this.listResults = function (data) {
    results.length = 0;
    for (var i = data.items.length - 1; i >= 0; i--) {
      results.push({
        id: data.items[i].id.videoId,
        title: data.items[i].snippet.title,
        description: data.items[i].snippet.description,
        thumbnail: data.items[i].snippet.thumbnails.default.url,
        author: data.items[i].snippet.channelTitle
      });
    }
    return results;
  }

  this.queueVideo = function (id, title) {
    var saved = localStorageService.get('upcoming');
    saved.push({
        id: id,
        title: title
    });
    localStorageService.add('upcoming', saved);
    upcoming = localStorageService.get('upcoming');
    return upcoming;
  };

  this.archiveVideo = function (id, title) {
    var saved = localStorageService.get('history');
    saved.unshift({
      id: id,
      title: title
    });
    localStorageService.add('history', saved);
    history = localStorageService.get('history');
    return history;
  };

  this.deleteVideo = function (list, id) {
    var videos = localStorageService.get(list);
    for (var i = videos.length - 1; i >= 0; i--) {
      if (videos[i].id === id) {
        videos.splice(i, 1);
        break;
      }
    }
    localStorageService.add(list, videos);
  };

  this.getYoutube = function () {
    return youtube;
  };

  this.getResults = function () {
    return results;
  };

  this.getUpcoming = function () {
    upcoming = localStorageService.get('upcoming');
    return upcoming;
  };

  this.getHistory = function () {
    history = localStorageService.get('history');
    return history;
  };

}]);

// Controller

app.controller('VideosController', function ($scope, $http, $log, VideosService) {

    init();

    function init() {
      $scope.youtube = VideosService.getYoutube();
      $scope.results = VideosService.getResults();
      $scope.upcoming = VideosService.getUpcoming();
      $scope.history = VideosService.getHistory();
      $scope.playlist = true;
    }

    $scope.launch = function (id, title) {
      VideosService.launchPlayer(id, title);
      VideosService.archiveVideo(id, title);
      VideosService.deleteVideo('upcoming', id);
      $scope.upcoming = VideosService.getUpcoming();
      $log.info('Launched id:' + id + ' and title:' + title);
    };

    $scope.queue = function (id, title) {
      VideosService.queueVideo(id, title);
      $scope.upcoming = VideosService.getUpcoming();
      VideosService.deleteVideo('history', id);
      $scope.history = VideosService.getHistory();
      $log.info('Queued id:' + id + ' and title:' + title);
    };

    $scope.delete = function (list, id) {
      VideosService.deleteVideo(list, id);
      $scope.upcoming = VideosService.getUpcoming();
      $scope.history = VideosService.getHistory();
    };

    $scope.search = function () {
      $http.get('https://www.googleapis.com/youtube/v3/search', {
        params: {
          //key: 'AIzaSyD2K6OooNWMPgEWlkAkgAIRctksFyKk1vY',
          key: 'AIzaSyBvcpEOTJSKE9lIF8QPOjsz9FKIK-Z8JrE',
          type: 'video',
          maxResults: '8',
          part: 'id,snippet',
          fields: 'items/id,items/snippet/title,items/snippet/description,items/snippet/thumbnails/default,items/snippet/channelTitle',
          q: this.query
        }
      })
      .success( function (data) {
        VideosService.listResults(data);
        $log.info(data);
      })
      .error( function () {
        $log.info('Search error');
      });
    }

    $scope.tabulate = function (state) {
      $scope.playlist = state;
    }

});