(function() {
  'use strict';

  angular
    .module('app')
    .controller('ServidorRemuneracaoController', ServidorRemuneracaoController);

    ServidorRemuneracaoController.$inject = ['$scope', '$state', '$stateParams', 'servidorService', 'Spinner'];

  function ServidorRemuneracaoController($scope, $state, $stateParams, servidorService, Spinner) {
    var vm = this;
    vm.$state = $state;

    //definitions
    vm.carregar = carregar;
    vm.mudarReferencia = mudarReferencia;
    vm.print = print;
    vm.selecionarReferenciaAtual = selecionarReferenciaAtual;

    iniciar();

    function iniciar() {
      vm.carregar();
    }

    function carregar() {
      if(servidorService.atual && servidorService.atual.id === $stateParams.servidorId) {
        vm.servidor = servidorService.atual;
        vm.selecionarReferenciaAtual();
      } else {
        Spinner.show("Carregando dados...");

        servidorService.get({ id: $stateParams.servidorId }, function(data) {
          vm.servidor = data;
          servidorService.atual = data;
          vm.selecionarReferenciaAtual();

          Spinner.hide();
        }, function(error) {
          Spinner.hide();
          toastr.error(error.data.mensagem);
        })
      }
    }

    function mudarReferencia(remuneracao) {
      vm.remuneracaoEscolhida = remuneracao;
    }

    /*function print() {
      window.print();
    }*/
    function print() {
      var printContents = document.getElementById('printable').innerHTML;     
      var popupWin = window.open('', '_blank', 'width=600,height=600');
      popupWin.document.open();
      popupWin.document.write('<html><head><link rel="stylesheet" type="text/css" href="/public/stylesheets/libs/bootstrap.min.css" /><link rel="stylesheet" type="text/css" href="/public/stylesheets/print.css" /></head><body onload="window.print()"><div class="servidor-detalhes">' + printContents + '</div></body></html>');
      popupWin.document.close();
    }

    function selecionarReferenciaAtual() {
      vm.mudarReferencia( vm.servidor.remuneracoes[ vm.servidor.remuneracoes.length - 1 ] );
    }
  }
})();

