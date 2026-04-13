(function() {
  'use strict';

  angular
    .module('app')
    .factory('servidorService', servidorService);

  servidorService.$inject = ['$resource'];

  function servidorService($resource) {
    var resource = $resource(
      '/api/servidores/:action:id',
      { id: '@id' },
      {}
    );

    return resource;
  }
})();
