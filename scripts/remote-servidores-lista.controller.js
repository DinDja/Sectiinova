(function() {
  'use strict';

  angular
    .module('app')
    .controller('ServidoresListaController', ServidoresListaController);

    ServidoresListaController.$inject = ['$scope', '$state', 'servidorService', 'Paginacao', 'Spinner','$http'];

  function ServidoresListaController($scope, $state, servidorService, Paginacao, Spinner, $http) {
    var vm = this;
    vm.$state = $state;

    //definitions
    vm.buscar = buscar;
    vm.baixar = baixar;
    vm.popUpDetalhesValores= popUpDetalhesValores;
    vm.popUpRequisitosHardwareSoftware= popUpRequisitosHardwareSoftware;
    vm.recaptchaValidatated = false;
    vm.carregarAnos = carregarAnos;
    vm.carregarMeses = carregarMeses;
    vm.habilitaCheck = habilitaCheck;

    vm.carregarCargos = carregarCargos;
    vm.carregarCargoComissao = carregarCargoComissao;
    vm.carregarCategoriaFuncional = carregarCategoriaFuncional;
    vm.carregarOrgaoLotacao = carregarOrgaoLotacao;
    vm.carregarOrgaoExercicio = carregarOrgaoExercicio;
    vm.chkSemVinculo = false;
    vm.chkSemVinculoCedido = false;
    vm.chkCargoEfetivo = false;
    vm.chkEmpregoPublico = false;
    vm.chkFuncaoReda = false;
    vm.chkEstagiariosResidentes = false;
    vm.chkInativos = false;
    vm.chkPensionistas = false;
    vm.auxVinculo = null;
    vm.carregaFiltros = carregaFiltros;
    //vm.verificaValorFiltro = verificaValorFiltro;
    vm.limpaCheckBox = limpaCheckBox;

    iniciar();

    function iniciar() {
      vm.filtros = {}
      vm.carregarAnos();
      vm.paginador = Paginacao.getPaginador(function (pagina) {
        vm.buscar(pagina);
      });

    }

    function habilitaCheck($event, itemCheck){

      let itemEnabled = $event.currentTarget.id;


      let checkItens = ['semVinculo','semVinculoCedido','cargoEfetivo','empregoPublico','funcaoReda','estagiariosResidentes','inativos','pensionistas'] 
      var checker = document.getElementById(itemEnabled);

      checkItens.forEach(element => {
          if (element !== itemEnabled){
            document.getElementById(element).checked = false;
            document.getElementById(element).value = false;
          }
          else{
            vm.limpaCheckBox(itemEnabled);
            
          }
      });


    }


    
    function carregarAnos() {
    	  $http({ method: 'GET', url: '/api/servidores/anos-disponiveis/' })
    	    .then(function(response) {
    	      // O objeto de resposta está agora em response.data
    	      vm.anos = response.data;

    	      if (vm.anos.length > 0) {
    	      //  vm.filtros.anoEscolhido = vm.anos[0];
    	    	//  vm.filtros.anoEscolhido = vm.anos[vm.anos.length - 1]; // Seleciona o último elemento (o ano mais recente)
    	    	  vm.filtros.anoEscolhido = Math.max(...vm.anos); // Seleciona o ano mais recente
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
    	        // Converte para números e ordena numericamente
    	        vm.meses = vm.meses.map(Number).sort((a, b) => a - b);
    	        // Encontra o maior mês (excluindo 0)
    	        const highestMonth = Math.max(...vm.meses.filter(m => m !== 0));
    	        vm.filtros.mesEscolhido = highestMonth;
    	      }

    	      Spinner.hide();
    	    })
    	    .catch(function(error) {
    	      Spinner.hide();
    	      toastr.error(error.data.mensagem);
    	    });
    	}
    
    function limpaCheckBox(vinculo){
      let filtroVinculoBusca;

      if (vinculo === 'semVinculo'){
        vm.chkSemVinculoCedido = vm.chkCargoEfetivo = 
        vm.chkEmpregoPublico = vm.chkFuncaoReda = 
        vm.chkEstagiariosResidentes = vm.chkInativos = vm.chkPensionistas = false; 
      }else if (vinculo ==='semVinculoCedido'){
        vm.chkSemVinculo = vm.chkCargoEfetivo =
        vm.chkEmpregoPublico = vm.chkFuncaoReda =
        vm.chkEstagiariosResidentes = vm.chkInativos = vm.chkPensionistas = false;
      }else if(vinculo ==='cargoEfetivo'){
        vm.chkSemVinculo = vm.chkSemVinculoCedido = 
        vm.chkEmpregoPublico = vm.chkFuncaoReda = 
        vm.chkEstagiariosResidentes = vm.chkInativos = vm.chkPensionistas = false;
      }else if(vinculo ==='empregoPublico'){
        vm.chkSemVinculo = vm.chkSemVinculoCedido = 
        vm.chkCargoEfetivo = vm.chkFuncaoReda = 
        vm.chkEstagiariosResidentes = vm.chkInativos = vm.chkPensionistas = false;
      }else if (vinculo ==='funcaoReda'){
        vm.chkSemVinculo = vm.chkSemVinculoCedido = 
        vm.chkCargoEfetivo = vm.chkEmpregoPublico = 
        vm.chkEstagiariosResidentes = vm.chkInativos = vm.chkPensionistas = false;
      }else if (vinculo ==='estagiariosResidentes'){
        vm.chkSemVinculo = vm.chkSemVinculoCedido = 
        vm.chkCargoEfetivo = vm.chkEmpregoPublico = 
        vm.chkFuncaoReda = vm.chkInativos = vm.chkPensionistas = false;
      }else if(vinculo ==='inativos'){
        vm.chkSemVinculo = vm.chkSemVinculoCedido = 
        vm.chkCargoEfetivo = vm.chkEmpregoPublico = 
        vm.chkFuncaoReda = vm.chkEstagiariosResidentes = vm.chkPensionistas = false;
      }else if(vinculo ==='pensionistas'){
        vm.chkSemVinculo = vm.chkSemVinculoCedido =
        vm.chkCargoEfetivo = vm.chkEmpregoPublico =
        vm.chkFuncaoReda = vm.chkEstagiariosResidentes = vm.chkInativos = false;
      }

      //limpa servidores na tela ao mudar o checkbox do vinculo
      vm.servidores = null;

      return filtroVinculoBusca;

    }

    function carregaFiltros(tipoFiltro){
      vm.carregarCargos(tipoFiltro);
      vm.carregarCargoComissao(tipoFiltro);
      vm.carregarCategoriaFuncional(tipoFiltro);
      vm.carregarOrgaoLotacao(tipoFiltro);
      vm.carregarOrgaoExercicio(tipoFiltro);

      // console.log('vm.chkSemVinculo ' );
      // console.log(vm.chkSemVinculo );
      // console.log('vm.chkSemVinculoCedido ');
      // console.log(vm.chkSemVinculoCedido );
      // console.log('vm.chkCargoEfetivo ' );
      // console.log(vm.chkCargoEfetivo );
      // console.log('vm.chkEmpregoPublico ');
      // console.log(vm.chkEmpregoPublico );
      // console.log('vm.chkFuncaoReda ' );
      // console.log(vm.chkFuncaoReda );
      // console.log('vm.chkEstagiariosResidentes ' );
      // console.log(vm.chkEstagiariosResidentes );
      // console.log('vm.chkInativos ');
      // console.log(vm.chkInativos );
    }

 
    
    function carregarCargos(vinculo) {
    	vm.filtros.cargoEscolhido = null; 
	    vm.cargos = null;
    	vm.dadosCarregadosCargos = false;
    	  var parametros = { ano: vm.filtros.anoEscolhido, mes: vm.filtros.mesEscolhido, vinculo: vinculo };
    	    // Variável de controle para indicar se os dados foram carregados
    	  
    	   $http({
    	      method: 'GET',
    	      url: '/api/servidores/cargos-disponiveis/',
    	      params: parametros
    	    })
    	    .then(function(response) {
    	    	vm.dadosCarregadosCargos = true;
    	      vm.cargos = response.data;    	    
    	       // Atualiza a variável de controle para indicar que os dados foram carregados com sucesso


    	      if (vm.cargos.length > 0) {    	      
    	        vm.cargos.unshift("");
    	        vm.cargos.sort();

    	        vm.filtros.cargoEscolhido = vm.cargos[0];
    	      }
    	    })
    	    .catch(function(error) {
    	      toastr.error(error.data.mensagem);
    	    });
    	}  
    
    
    
    function carregarCargoComissao(vinculo) {
        vm.filtros.cargoComissaoEscolhido = null; // Definir como null enquanto os dados estão sendo carregados
        vm.cargosComissao= null; 
        vm.dadosCarregados = false; // Variável de controle para indicar se os dados foram carregados

        let vinculoBusca;
        let cargoBusca;

        if (vinculo) {
            if (vinculo >= 1 && vinculo <= 9) {
                vinculoBusca = vinculo;
                cargoBusca = null;
                vm.auxVinculo = vinculo;
            } else {
                vinculoBusca = vm.auxVinculo;
                cargoBusca = vinculo;
            }
        }
        var parametros = { vinculo: vinculoBusca, cargo: cargoBusca };

        $http({
            method: 'GET',
            url: '/api/servidores/cargos-comissao-disponiveis/',
            params: parametros
        })
        .then(function(response) {
            vm.cargosComissao = response.data;
            vm.dadosCarregados = true; // Atualiza a variável de controle para indicar que os dados foram carregados com sucesso

            if (vm.cargosComissao.length > 0) {
                vm.cargosComissao.sort();

                if (vinculo !== 1) {
                    vm.cargosComissao.unshift("NENHUM", "TODOS");
                }

                vm.filtros.cargoComissaoEscolhido = vm.cargosComissao[0]; // Definir o primeiro cargo como selecionado após o carregamento dos dados
            }
        })
        .catch(function(error) {
            toastr.error(error.data.mensagem);
        });
    }


  

    
    function carregarCategoriaFuncional(vinculo) {
        vm.filtros.categoriaFuncionalEscolhido = null; // Definir como null enquanto os dados estão sendo carregados
        vm.categoriasFuncionais = null; 
        vm.dadosCarregadosCategoriasFuncionais = false;  // Variável de controle para indicar se os dados foram carregados

    	  $http({ method: 'GET', url: '/api/servidores/categorias-funcionais-disponiveis/' + vinculo })
    	    .then(function(response) {
    	      vm.categoriasFuncionais = response.data;
    	      vm.dadosCarregadosCategoriasFuncionais = true; // Atualiza a variável de controle para indicar que os dados foram carregados com sucesso

    	      if (vm.categoriasFuncionais.length > 0) {
    	        vm.categoriasFuncionais.sort();
    	        vm.filtros.categoriaFuncionalEscolhido = vm.categoriasFuncionais[0];
    	      }
    	    })
    	    .catch(function(error) {
    	      toastr.error(error.data.mensagem);
    	    });
    	}   
    
    
  

    function carregarOrgaoLotacao(vinculo) {
    	  $http({ method: 'GET', url: '/api/servidores/orgao-lotacao-disponiveis/' + vinculo })
    	    .then(function(response) {
    	      vm.orgaosLotacao = response.data;

    	      if (vm.orgaosLotacao.length > 0) {
    	        vm.orgaosLotacao.unshift("");
    	        vm.orgaosLotacao.sort();
    	        vm.filtros.orgaoLotacaoEscolhido = vm.orgaosLotacao[0];
    	      }
    	    })
    	    .catch(function(error) {
    	      toastr.error(error.data.mensagem);
    	    });
    	}

    function carregarOrgaoExercicio(vinculo) {
        $http({method: 'GET', url: '/api/servidores/orgao-exercicio-disponiveis/' + vinculo}).
        then(function(response) {
  	      vm.orgaosExercicio = response.data;
            if( vm.orgaosExercicio.length > 0 ){
              vm.orgaosExercicio.unshift("");
              vm.orgaosExercicio.sort();
              vm.filtros.orgaoExercicioEscolhido = vm.orgaosExercicio[0];
            }           
          })
          .catch(function(error) {
    	      toastr.error(error.data.mensagem);
    	    });
      }
    
    
    function baixar(pagina) {
        
    	  let cargoComissaoSimbolo;
          let cargoEscolhido;
          let simboloEscolhido;
          let simboloEscolhidoConvertido;

          if ((!vm.chkFuncaoReda) && (!vm.chkEstagiariosResidentes)){
             cargoComissaoSimbolo = vm.filtros.cargoComissaoEscolhido.split(' -',2);  
             cargoEscolhido = cargoComissaoSimbolo[0];
             simboloEscolhido = cargoComissaoSimbolo[1];
          }else{
             cargoComissaoSimbolo = vm.filtros.cargoComissaoEscolhido;
             cargoEscolhido = null;
             simboloEscolhido = null;
          }


          if (simboloEscolhido) {
            simboloEscolhidoConvertido = simboloEscolhido.substring(1);
          }

          if(!vm.recaptchaValidatated && pagina == 1){
            var grecaptchaResponse = grecaptcha.getResponse();
           
            var parametros = { pagina: pagina, cpf: vm.filtros.cpf, nome: vm.filtros.nome,
                recaptcha: grecaptchaResponse,
                ano: vm.filtros.anoEscolhido,
                mes: vm.filtros.mesEscolhido,
                semVinculo: vm.chkSemVinculo,
                semVinculoCedido: vm.chkSemVinculoCedido,
                cargoEfetivo: vm.chkCargoEfetivo,
                empregoPublico: vm.chkEmpregoPublico,
                funcaoReda: vm.chkFuncaoReda,
                estagioResidentes: vm.chkEstagiariosResidentes,
                inativos: vm.chkInativos,
                pensionistas: vm.chkPensionistas,
                cargo: vm.filtros.cargoEscolhido,
                cargoComissao: cargoEscolhido,
                simbolo: simboloEscolhidoConvertido,
                categoriaFuncional: vm.filtros.categoriaFuncionalEscolhido,
                orgaoLotacao: vm.filtros.orgaoLotacaoEscolhido,
                orgaoExercicio: vm.filtros.orgaoExercicioEscolhido,
              };

          }else{
            var parametros = { pagina: pagina, cpf: vm.filtros.cpf, nome: vm.filtros.nome,
                ano: vm.filtros.anoEscolhido,
                mes: vm.filtros.mesEscolhido,
                semVinculo: vm.chkSemVinculo,
                semVinculoCedido: vm.chkSemVinculoCedido,
                cargoEfetivo: vm.chkCargoEfetivo,
                empregoPublico: vm.chkEmpregoPublico,
                funcaoReda: vm.chkFuncaoReda,
                estagioResidentes: vm.chkEstagiariosResidentes,
                inativos: vm.chkInativos,
                pensionistas: vm.chkPensionistas,
                cargo: vm.filtros.cargoEscolhido,
                cargoComissao: cargoEscolhido,
                simbolo: simboloEscolhidoConvertido,
                categoriaFuncional: vm.filtros.categoriaFuncionalEscolhido,
                orgaoLotacao: vm.filtros.orgaoLotacaoEscolhido,
                orgaoExercicio: vm.filtros.orgaoExercicioEscolhido,
            };

          }                    
    	 
    	
    	    		 Spinner.show("Gerando...");
    	 	         vm.processando = true;
    	 	         vm.captchaValido = true;
    	 	        // window.open("/api/servidores/exportacao/?mes=" + vm.filtros.mesEscolhido + "&ano=" + vm.filtros.anoEscolhido);
    	 	       //  Spinner.hide();
    	 	        // vm.processando = false;
    	 	         
    	 	        var url = "/api/servidores/exportacao/?";
    	 	       for (var key in parametros) {
    	 	         if (parametros.hasOwnProperty(key)) {
    	 	           url += key + "=" + encodeURIComponent(parametros[key]) + "&";
    	 	         }
    	 	       }
    	 	       url = url.slice(0, -1);  // Remove o último "&"

    	 	       // Iniciar o download usando window.open
    	 	       window.open(url);

    	 	       // Ocultar o spinner após o download ser iniciado
    	 	       Spinner.hide();
    	 	       vm.processando = false;
    	 	    

    				
    	     }
    
	function print() {
	      var printContents = document.getElementById('printable').innerHTML;     
	      var popupWin = window.open('', '_blank', 'width=2100,height=600');
	      popupWin.document.open();
	      popupWin.document.write('<html><head><link rel="stylesheet" type="text/css" href="/public/stylesheets/libs/bootstrap.min.css" /><link rel="stylesheet" type="text/css" href="/public/stylesheets/print.css" /></head><body onload="window.open()"><div class="servidor-detalhes">' + printContents + '</div></body></html>');
	      popupWin.document.close();
	}
	
	function popUpDetalhesValores() {
		  var detailsContents = `
		 <center>  <h2>Informações</h2>  </center>
		    <ul>
		      <li><strong>Remuneração Bruta (RB):</strong> Composta pela soma de todas as parcelas remuneratórias fixas pagas ao servidor – correspondentes ao cargo efetivo, função, cargo em comissão, posto, graduação ou emprego público – e das eventuais diferenças de rubricas concernentes à Remuneração Bruta (RB) não pagas anteriormente ao servidor ou empregado público.</li>
		      <li><strong>Remuneração Temporária (RT):</strong> Composta por parcelas variáveis que não integram a remuneração fixa – tais como 13º salário, férias, gratificações variáveis, decisões judiciais, dentre outras – e inclusive das eventuais diferenças de rubricas concernentes à Remuneração Temporária (RT) não pagas anteriormente ao servidor ou empregado público.</li>
		      <li><strong>Descontos Legais (DL):</strong> Referem-se às deduções previstas nas legislações vigentes, tais como Imposto de Renda Retido na Fonte (IRRF), FUNPREV, BAPREV, INSS, SPSM, indenização ao erário, adiantamento do 13º salário, adiantamento de férias e demais deduções, excluídos os descontos pessoais, a exemplo de despesas com plano de saúde, pensão alimentícia, dentre outras.</li>
		      <li><strong>Remuneração Líquida (RL):</strong> Remuneração Bruta (RB), limitada ao Teto Constitucional, acrescida da Remuneração Temporária (RT); abatidos os Descontos Legais (DL), desconsiderando-se eventuais descontos facultativos ou decorrentes de decisões judiciais ou, ainda, valores referentes a Parcelas Indenizatórias.</li>
		      <li><strong>Valores Indenizatórios (VI):</strong> Compostas por vantagens que não estão incluídas na Remuneração Líquida (RL) e não se incorporam à remuneração, para qualquer efeito, a exemplo de auxílio alimentação, auxílio transporte e outros.</li>
		    </ul>
		  `;
		  
		
	// abre popup e Centraliza o popup na tela
		  var popupWin = window.open('', '_blank', 'width=600,height=550,left=' + (screen.width - 800) / 2 + ",top=" + (screen.height - 600) / 2);
		 // window.open("http://www.google.com", "", "width=800,height=600,left=" + (screen.width - 800) / 2 + ",top=" + (screen.height - 600) / 2);
		
		 popupWin.document.open();
		  popupWin.document.write('<html><head><title></title><style>/* Seus estilos CSS aqui */</style></head><body><div>' + detailsContents + '</div></body></html>');
		  popupWin.document.close();  	
		}
		
	function popUpRequisitosHardwareSoftware() {
		  var detailsContents = `
			<p>
		        <h4>REQUISITOS DE HARDWARE</h4>
	
		        <ul>
				  <li>Processador de 2 gigahertz (GHz) ou superior de 32 bits (x86) ou 64bits (x64)</li>
				  <li>2 gigabyte (GB) de RAM</li>
				  <li>Interface de rede para acesso à rede de dados do Transparência Bahia</li>
				  <li>1 GB de espaço em disco</li>
				  <li>Placa gráfica e monitor capaz de exibir uma resolução mínima de 1024x768 pixels</li>
				</ul>
				
				<h4>REQUISITOS DE SOFTWARE</h4>
	
				<ul>
				  <li>Google Chrome (versão 28 ou superior)</li>
				  <li>Navegador Internet Explorer (versão 11 ou superior)</li>
				  <li>Mozilla Firefox (versão 31 ou superior)</li>				 
		
				</ul>
			</p>
		  `;
		  
		
	// abre popup e Centraliza o popup na tela
		  var popupWin = window.open('', '_blank', 'width=600,height=300,left=' + (screen.width - 800) / 2 + ",top=" + (screen.height - 600) / 2);
		 // window.open("http://www.google.com", "", "width=800,height=600,left=" + (screen.width - 800) / 2 + ",top=" + (screen.height - 600) / 2);
		
		 popupWin.document.open();
		  popupWin.document.write('<html><head><title></title><style>/* Seus estilos CSS aqui */</style></head><body><div>' + detailsContents + '</div></body></html>');
		  popupWin.document.close();  	
		}
		
	

	
	
    function buscar(pagina) {
    //	 console.log("teste2");

      if ((vm.auxVinculo === 3 || vm.auxVinculo === 4 || vm.auxVinculo === 5 || vm.auxVinculo === 6 || vm.auxVinculo === 7 )  
      && (vm.filtros.cargoEscolhido === "")){
        alert("Selecione um Cargo");
      }else if((vm.auxVinculo === 1 || vm.auxVinculo === 2 ||vm.auxVinculo === 3 || vm.auxVinculo === 4 || vm.auxVinculo === 5 || vm.auxVinculo === 6 || vm.auxVinculo === 7 || vm.auxVinculo === 8 )  
       && (vm.filtros.mesEscolhido === 0)){
         alert("Selecione um Mês");
      }else if(!vm.auxVinculo || ( !vm.chkSemVinculo && !vm.chkSemVinculoCedido && !vm.chkCargoEfetivo && !vm.chkEmpregoPublico && !vm.chkFuncaoReda && !vm.chkEstagiariosResidentes && !vm.chkInativos && !vm.chkPensionistas ) ){
        alert("Selecione um Tipo de Vinculo");
      }else {

        let cargoComissaoSimbolo;
        let cargoEscolhido;
        let simboloEscolhido;
        let simboloEscolhidoConvertido;

        if ((!vm.chkFuncaoReda) && (!vm.chkEstagiariosResidentes)){
           if (vm.filtros.cargoComissaoEscolhido !== null){ 	
                cargoComissaoSimbolo = vm.filtros.cargoComissaoEscolhido.split(' -',2);
           }
           if (!cargoComissaoSimbolo || cargoComissaoSimbolo.length < 1 || typeof cargoComissaoSimbolo[0] === "undefined") { 	
        	     cargoEscolhido = "NENHUM";
        	 
           }
           else{ cargoEscolhido = cargoComissaoSimbolo[0];        	   
           }
           if (!cargoComissaoSimbolo || cargoComissaoSimbolo.length < 2 || typeof cargoComissaoSimbolo[1] === "undefined") { 	
            simboloEscolhido =  "NENHUM";
           }
           else   { simboloEscolhido = cargoComissaoSimbolo[1];
        	   }
        }else{
           cargoComissaoSimbolo = vm.filtros.cargoComissaoEscolhido;
           cargoEscolhido = null;
           simboloEscolhido = null;
        }


        if (simboloEscolhido) {
          simboloEscolhidoConvertido = simboloEscolhido.substring(1);
        }

        if(!vm.recaptchaValidatated && pagina == 1){
          var grecaptchaResponse = grecaptcha.getResponse();
         
          var parametros = { pagina: pagina, cpf: vm.filtros.cpf, nome: vm.filtros.nome,
              recaptcha: grecaptchaResponse,
              ano: vm.filtros.anoEscolhido,
              mes: vm.filtros.mesEscolhido,
              semVinculo: vm.chkSemVinculo,
              semVinculoCedido: vm.chkSemVinculoCedido,
              cargoEfetivo: vm.chkCargoEfetivo,
              empregoPublico: vm.chkEmpregoPublico,
              funcaoReda: vm.chkFuncaoReda,
              estagioResidentes: vm.chkEstagiariosResidentes,
              inativos: vm.chkInativos,
              pensionistas: vm.chkPensionistas,
              cargo: vm.filtros.cargoEscolhido,
              cargoComissao: cargoEscolhido,
              simbolo: simboloEscolhidoConvertido,
              categoriaFuncional: vm.filtros.categoriaFuncionalEscolhido,
              orgaoLotacao: vm.filtros.orgaoLotacaoEscolhido,
              orgaoExercicio: vm.filtros.orgaoExercicioEscolhido,
            };

        }else{
          var parametros = { pagina: pagina, cpf: vm.filtros.cpf, nome: vm.filtros.nome,
              ano: vm.filtros.anoEscolhido,
              mes: vm.filtros.mesEscolhido,
              semVinculo: vm.chkSemVinculo,
              semVinculoCedido: vm.chkSemVinculoCedido,
              cargoEfetivo: vm.chkCargoEfetivo,
              empregoPublico: vm.chkEmpregoPublico,
              funcaoReda: vm.chkFuncaoReda,
              estagioResidentes: vm.chkEstagiariosResidentes,
              inativos: vm.chkInativos,
              pensionistas: vm.chkPensionistas,
              cargo: vm.filtros.cargoEscolhido,
              cargoComissao: cargoEscolhido,
              simbolo: simboloEscolhidoConvertido,
              categoriaFuncional: vm.filtros.categoriaFuncionalEscolhido,
              orgaoLotacao: vm.filtros.orgaoLotacaoEscolhido,
              orgaoExercicio: vm.filtros.orgaoExercicioEscolhido,
          };

        }
        
        

        Spinner.show("Buscando...");

        servidorService.get(parametros, function(data) {
          vm.paginador.paginaAtual = pagina;
          vm.paginador.calcularNumeroPaginas(data.total);
          vm.servidores = angular.fromJson(data.dados);
          
          vm.recaptchaValidatated = false;
          grecaptcha.reset();
          Spinner.hide();
        }, function(error) {
          Spinner.hide();
          toastr.error(error.data.mensagem);
        })
        }
    }

  }
})();
