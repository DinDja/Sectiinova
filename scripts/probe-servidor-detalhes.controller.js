(function() {
  'use strict';

  angular
    .module('app')
    .controller('ServidorDetalhesController', ServidorDetalhesController);

  ServidorDetalhesController.$inject = ['$scope', '$state', '$stateParams', 'servidorService', 'Spinner'];

  function ServidorDetalhesController($scope, $state, $stateParams, servidorService, Spinner) {
    var vm = this;
    vm.$state = $state;

    //definitions
    vm.carregar = carregar;
    vm.print = print;

    iniciar();

    function iniciar() {
      vm.carregar();
    }

    function carregar() {
      if(servidorService.atual && servidorService.atual.id === $stateParams.servidorId) {
        vm.servidor = servidorService.atual;
      } else {
        Spinner.show("Carregando dados...");

        servidorService.get({ id: $stateParams.servidorId }, function(data) {
          vm.servidor = data;
          servidorService.atual = data;

          Spinner.hide();
        }, function(error) {
          Spinner.hide();
          toastr.error(error.data.mensagem);
        })
      }
    }

    /*function print() {
      window.print();
    }*/

function print() {
      var printContents = document.getElementById('printable').innerHTML;     
      var popupWin = window.open('', '_blank', 'width=300,height=300');
      popupWin.document.open();
      popupWin.document.write('<html><head><link rel="stylesheet" type="text/css" href="/public/stylesheets/libs/bootstrap.min.css" /><link rel="stylesheet" type="text/css" href="/public/stylesheets/print.css" /></head><body onload="window.print()"><div class="servidor-detalhes">' + printContents + '</div></body></html>');
      popupWin.document.close();
}
      

  }
})();

