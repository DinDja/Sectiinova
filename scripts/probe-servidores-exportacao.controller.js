(function() {
  'use strict';

  angular
    .module('app')
    .controller('ServidoresExportacaoController', ServidoresExportacaoController);

  ServidoresExportacaoController.$inject = ['$scope', '$state', 'servidorService', 'Paginacao', 'Spinner', '$http', 'recaptchaService'];

  function ServidoresExportacaoController($scope, $state, servidorService, Paginacao, Spinner, $http, recaptchaService) {
    var vm = this;
    vm.$state = $state;

    //definitions
    vm.baixar = baixar;
    vm.carregarAnos = carregarAnos;
    vm.carregarMeses = carregarMeses;
    vm.captchaValido = false;

    iniciar();

    function iniciar() {
      vm.filtros = {}
      vm.carregarAnos();
    }

    function carregarAnos() {
  	  $http({ method: 'GET', url: '/api/servidores/anos-disponiveis/' })
  	    .then(function(response) {
  	      // O objeto de resposta está agora em response.data
  	      vm.anos = response.data;

  	      if (vm.anos.length > 0) {
  	        vm.filtros.anoEscolhido = vm.anos[0];
  	      }

  	      vm.carregarMeses();
  	    })
  	    .catch(function(error) {
  	      // Use .catch() para lidar com erros
  	      toastr.error(error.data.mensagem);
  	    });
  	}
  

    function carregarMeses() {
  	  Spinner.show("Carregando...");

  	  $http({ method: 'GET', url: '/api/servidores/meses-disponiveis/' + vm.filtros.anoEscolhido })
  	    .then(function(response) {
  	      vm.meses = response.data;

  	      if (vm.meses.length > 0) {
  	        vm.meses.unshift(0);
  	        vm.meses.sort();
  	        vm.filtros.mesEscolhido = vm.meses[vm.meses.length - 1];
  	      }

  	      Spinner.hide();
  	    })
  	    .catch(function(error) {
  	      Spinner.hide();
  	      toastr.error(error.data.mensagem);
  	    });
  	}

    function baixar(pagina) {
    
   //console.log("teste");
    		 Spinner.show("Gerando...");
 	         vm.processando = true;
 	         vm.captchaValido = true;
 	         window.open("/api/servidores/exportacao/?mes=" + vm.filtros.mesEscolhido + "&ano=" + vm.filtros.anoEscolhido);
 	         Spinner.hide();
 	         vm.processando = false;
    	
     }

  }
})();

