(function() {
  'use strict';

  angular
    .module('app')
    .config(route);

  route.$inject = ['$stateProvider', '$urlRouterProvider'];

  function route($stateProvider, $urlRouterProvider){
	$stateProvider
	  .state('servidores', {
	    url: '/servidores',
	    templateUrl: '/public/templates/servidores-lista.html',
	    controller: 'ServidoresListaController as slCtrl'
	  })
    .state('servidores-exportacao', {
      url: '/servidores/exportacao/',
      templateUrl: '/public/templates/servidores-exportacao.html',
      controller: 'ServidoresExportacaoController as exportacaoCtrl'
    })
	  .state('servidor-detalhes', {
	    url: '/servidores/:servidorId',
	    templateUrl: '/public/templates/servidor-detalhes.html',
	    controller: 'ServidorDetalhesController as sdCtrl'
	  })
    .state('servidor-remuneracao', {
      url: '/servidores/remuneracao/:servidorId',
      templateUrl: '/public/templates/servidor-remuneracao.html',
      controller: 'ServidorRemuneracaoController as remuCtrl'
    })
    .state('servidores-tabela-detalhes', {
      url: '/servidores/detalhes/',
      templateUrl: '/public/templates/servidor-remuneracao.html',
      controller: 'ServidoresTabelaDetalhesController as tabDetRemuCtrl'
    })
	  .state('home', {

	  });

    $urlRouterProvider.otherwise('/servidores');
  };
})();

