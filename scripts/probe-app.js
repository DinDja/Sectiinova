(function() {
  'use strict';


  var browserOk = (bowser.chrome && bowser.version >= 28) || (bowser.msie && bowser.version >= 11) || (bowser.firefox && bowser.version >= 31) || (bowser.safari && bowser.version >= 10) || (bowser.ios);

  if( !browserOk ) {
    $( document ).ready(function() {
      document.getElementById("main").className += " hide"
      document.getElementById("navegadores-suportados").className = document.getElementById("navegadores-suportados").className.replace( 'hide' , '' );
    });
  }

  angular
    .module('app', [
      'ngAnimate',
      'ngResource',
      'ui.router',
      'ui.utils',
      'prodeb-components',
      '720kb.tooltips'
    ]);

  angular
    .module('app')
    .config(config)
   .controller('AppController', ['$scope', '$http', function($scope, $http) {
      $http.get('/api/ambiente').then(function(response) {
          $scope.ambiente = response.data;
       //  console.log('Ambiente :' + response.data);
      });
    }]);

  config.$inject = [];

  function config(){

  };

})();

