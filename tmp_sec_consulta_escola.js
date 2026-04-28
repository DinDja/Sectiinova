var tab1_val_inic;
var qual_tab_esta_on;
var vetMSG;

qual_tab_esta_on = 1;

function mudaInformativo(pMsg){
	vetMSG = new Array();
	vetMSG[ 0 ] = 'A responsabilidade de informações Administrativas é da CLO - Coordenação de Legalização e Orientação das Unidades Escolares - telefone 3115-9132.';
	vetMSG[ 1 ] = 'A responsabilidade das informações de Histórico é da CLO - Coordenação de Legalização e Orientação das Unidades Escolares - telefone 3115-9132';
	vetMSG[ 2 ] = 'A responsabilidade das informações de Atos Legais é da CLO - Coordenação de Legalização e Orientação das Unidades Escolares - telefone 3115-9132';
	vetMSG[ 3 ] = 'A responsabilidade das informações de Cadastro é da CLO - Coordenação de Legalização e Orientação das Unidades Escolares - telefone 3115-9132.';
	vetMSG[ 4 ] = 'Clique no nome do fornecedor para visualizar os detalhes do consumo da escola. <br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; A responsabilidade das informações de consumo é da CEG - Coordenação de Encargos Gerais - telefone 3115-9089/3115-8904.';
	vetMSG[ 5 ] = 'A responsabilidade das informações do <b>Censo</b> é da SUPAV/CAV - Coordenação de Acompanhamento e Avaliação - telefone 3115-9171.';
	vetMSG[ 6 ] = 'A responsabilidade das informações de <b>Alunos</b>:<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Até 2009 é da SUPAV/CAI-CIE - Coordenação de Informação Educacional - Banco Aluno -  telefone 31159153 / 31159172.<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;A partir de 2010 passa a ser do SGE - Telefone 3115-7193.';
	vetMSG[ 7 ] = 'A responsabilidade das informações de Vigilância e Serviço é da CEG - Coordenação de Encargos Gerais - telefone 3115-9089/3115-8904.';
	vetMSG[ 8 ] = '';
	//vetMSG[ 9 ] = 'A responsabilidade das informações dos <b>Lideres de Classe</b> é da DIREB - Diretoria de Educação Básica - telefone 3115-9007.<br><br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<b>Informações sobre o sistema e o cadastramento dos líderes de classe, ligar para o 0800 285 8000 opção 02.</b>';
	vetMSG[ 9 ] = 'Informações sobre o sistema e o cadastramento dos líderes de classe, ligar para o setor da COORDENAÇÃO DE PROJETOS ESTRATÉGICOS DA EDUCAÇÃO Tel. 3115-8991.';
	vetMSG[ 10 ] = 'A responsabilidade das informações do <b>Censo</b> é da SUPAV/CAV - Coordenação de Acompanhamento e Avaliação - telefone 3115-9171.';
	vetMSG[ 11 ] = 'A responsabilidade das informações do <b>Censo</b> é da SUPAV/CAV - Coordenação de Acompanhamento e Avaliação - telefone 3115-9171.';
	vetMSG[ 12 ] = 'A responsabilidade das informações do <b>FAED</b> é da SUPEC/DIRAF - Diretoria de Administração Financeira - telefone 3115-9144.';
	vetMSG[ 13 ] = '';
	vetMSG[ 14 ] = 'A responsabilidade das informações do <b>Caixa Escolar</b> é da SUPAV - Coordenação de Acompanhamento e Avaliação - telefone 3115-9171.';
	vetMSG[ 16 ] = 'A responsabilidade das informações dos <b>Servidores</b> é da DIPES - Diretoria de Planejamento e Desenvolvimento de Pessoal da Rede Escolar - telefone 3115-9113/3115-8935.';
	vetMSG[ 18 ] = 'A responsabilidade das informações dos <b>Documentos</b> é da CCP - Coordenação de Cadastro e Controle Patrimonial - telefone 3115-8956/3115-1001.';
	vetMSG[ 19 ] = '';
	vetMSG[ 20 ] = 'A responsabilidade das informações do <b>Colegiado</b> é da <b>CONTE</b> - Coordenação de Articulação dos Nucleos Territorias da Educação';
	vetMSG[ 27 ] = 'A responsabilidade das informações de <b>Licitação</b> é da Unidade Escolar.';
	idTDInformativo.innerText ='';
	if( vetMSG[ pMsg ] !=""){
		idTDInformativo.insertAdjacentHTML( "AfterBegin", "<center><font color='C40000'><b>*</b></font><font style='font-family:tahoma,sans-serif; font-size:9px;margin-top:0px;margin-left:0px;margin-right:10px;margin-bottom:2px;background-color:#ffffff'>"+vetMSG[pMsg]);
		idTDInformativo.insertAdjacentHTML( "BeforeEnd", "</font></center>");
	}
	return true;
}
function Legenda(leg){
	if (leg == 16){
		//document.all['idTBCabecalho'].style.display = 'block';
		document.all['idTBLegenda'].style.display = 'block';
	}else{
		if (leg != 13){
			//document.all['idTBCabecalho'].style.display = 'none';
			document.all['idTBLegenda'].style.display = 'none';
		}
	}
}
function Abafixa(pag){
	//Mostra e Remove a sub aba de Servidores, documento e colegiado
	if (pag == 16){
		document.all['idTBSubAba'].style.display= 'block';
		document.all['idTBSubAba_col'].style.display= 'none';
		document.all['idTBSubAba_doc'].style.display= 'none';
		document.all['idTBSubAba_ele'].style.display= 'none';
		document.all['idTBSubAba_lider'].style.display= 'none';
		document.all['idTBSubAba_com'].style.display= 'none';
		document.all['idTBSubAba_docE'].style.display= 'none';
		document.all['idTBSubAba_doc2'].style.display= 'none';
	}else{
		if (pag == 18){
			document.all['idTBSubAba'].style.display= 'none';
			document.all['idTBSubAba_col'].style.display= 'none';
			document.all['idTBSubAba_doc'].style.display= 'block';
			document.all['idTBSubAba_ele'].style.display= 'none';
			document.all['idTBSubAba_lider'].style.display= 'none';
			document.all['idTBSubAba_com'].style.display= 'none';
			document.all['idTBSubAba_docE'].style.display= 'none';
			document.all['idTBSubAba_doc2'].style.display= 'none';
		}else{
			if (pag == 20){
				document.all['idTBSubAba'].style.display= 'none';
				document.all['idTBSubAba_col'].style.display= 'block';
				document.all['idTBSubAba_doc'].style.display= 'none';
				document.all['idTBSubAba_ele'].style.display= 'none';
				document.all['idTBSubAba_lider'].style.display= 'none';
				document.all['idTBSubAba_com'].style.display= 'none';
				document.all['idTBSubAba_docE'].style.display= 'none';
				document.all['idTBSubAba_doc2'].style.display= 'none';
			}else{
				if (pag == 21){
					document.all['idTBSubAba'].style.display= 'none';
					document.all['idTBSubAba_col'].style.display= 'none';
					document.all['idTBSubAba_doc'].style.display= 'none';
					document.all['idTBSubAba_ele'].style.display= 'block';
					document.all['idTBSubAba_lider'].style.display= 'none';	
					document.all['idTBSubAba_com'].style.display= 'none';
					document.all['idTBSubAba_docE'].style.display= 'none';
					document.all['idTBSubAba_doc2'].style.display= 'none';				
			}else{
				if (pag == 9){
					document.all['idTBSubAba'].style.display= 'none';
					document.all['idTBSubAba_col'].style.display= 'none';
					document.all['idTBSubAba_doc'].style.display= 'none';
					document.all['idTBSubAba_ele'].style.display= 'none';	
					document.all['idTBSubAba_lider'].style.display= 'block';
					document.all['idTBSubAba_com'].style.display= 'none';
					document.all['idTBSubAba_docE'].style.display= 'none';	
					document.all['idTBSubAba_doc2'].style.display= 'none';					
				}else{
				if (pag == 22){
					document.all['idTBSubAba'].style.display= 'none';
					document.all['idTBSubAba_col'].style.display= 'none';
					document.all['idTBSubAba_doc'].style.display= 'none';
					document.all['idTBSubAba_ele'].style.display= 'none';	
					document.all['idTBSubAba_lider'].style.display= 'none';
					document.all['idTBSubAba_com'].style.display= 'none';
					document.all['idTBSubAba_docE'].style.display= 'none';
					document.all['idTBSubAba_doc2'].style.display= 'block';					
				}else{
				if (pag == 25){
					document.all['idTBSubAba'].style.display= 'none';
					document.all['idTBSubAba_col'].style.display= 'none';
					document.all['idTBSubAba_doc'].style.display= 'none';
					document.all['idTBSubAba_ele'].style.display= 'none';	
					document.all['idTBSubAba_lider'].style.display= 'none';
					document.all['idTBSubAba_com'].style.display= 'block';
					document.all['idTBSubAba_docE'].style.display= 'none';
					document.all['idTBSubAba_doc2'].style.display= 'none';		
			}else{
				if (pag == 26){
					document.all['idTBSubAba'].style.display= 'none';
					document.all['idTBSubAba_col'].style.display= 'none';
					document.all['idTBSubAba_doc'].style.display= 'none';
					document.all['idTBSubAba_ele'].style.display= 'none';	
					document.all['idTBSubAba_lider'].style.display= 'none';
					document.all['idTBSubAba_com'].style.display= 'none';
					document.all['idTBSubAba_docE'].style.display= 'block';
					document.all['idTBSubAba_doc2'].style.display= 'none';					
			}else{
				if (pag != 13){
					document.all['idTBSubAba'].style.display= 'none';
					document.all['idTBSubAba_col'].style.display= 'none';
					document.all['idTBSubAba_doc'].style.display= 'none';
					document.all['idTBSubAba_ele'].style.display= 'none';
					document.all['idTBSubAba_lider'].style.display= 'none';
					document.all['idTBSubAba_com'].style.display= 'none';
					document.all['idTBSubAba_docE'].style.display= 'none';
					document.all['idTBSubAba_doc2'].style.display= 'none';					
				}				
			 }
			}
				}
			}
			}
			}
			}  			
	}
}
function tab1_on(){
	qual_tab_esta_on = 1;
	if (FormEscola.tipo_escola.value=='Estadual' || FormEscola.tipo_escola.value=='Municipal' || FormEscola.tipo_escola.value=='Est./Conveniada'){
		mudaInformativo( 0 );
		FormEscola.action = '../administrativo/listar.asp';
	}else{
		if (FormEscola.codigo_secretaria.value != ''){
			mudaInformativo( 0 );
			FormEscola.action = '../administrativo/listar.asp';
		} else {
			mudaInformativo( 0 );
			FormEscola.action = '../administrativo/listar_nao_estaduais.asp';
		}
	}
	FormEscola.target='iframe_historico';
	FormEscola.submit();
	Abafixa(qual_tab_esta_on);
	Legenda(qual_tab_esta_on);
	return false;
}
function tab2_on(){
	qual_tab_esta_on = 2;
	mudaInformativo( 1 );
	FormEscola.action = '../historico/listar_historico.asp';
	FormEscola.target='iframe_historico';
	FormEscola.submit();
	Abafixa(qual_tab_esta_on);
	Legenda(qual_tab_esta_on);
	return false;
}
function tab3_on(){
	qual_tab_esta_on = 3;
	mudaInformativo( 2 );
	FormEscola.action = '../atos_legais/listar_atos.asp';
	FormEscola.target='iframe_historico';
	FormEscola.submit();
	Abafixa(qual_tab_esta_on);
	Legenda(qual_tab_esta_on);
	return false;
}
function tab4_on(){
	qual_tab_esta_on = 4;
	mudaInformativo( 3 );
	FormEscola.action = '../cadastro/listar_cadastro.asp';
	FormEscola.target='iframe_historico';
	FormEscola.submit();
	Abafixa(qual_tab_esta_on);
	Legenda(qual_tab_esta_on);
	return false;
}
function tab5_on(){
	qual_tab_esta_on = 5;
	mudaInformativo( 4 );
	FormEscola.action = '../consumo/listar_consumo.asp';
	FormEscola.target='iframe_historico';
	FormEscola.submit();
	Abafixa(qual_tab_esta_on);
	Legenda(qual_tab_esta_on);
	return false;
}
function tab6_on(){
	qual_tab_esta_on = 6;
	mudaInformativo( 5 );
	FormEscola.action = '../rede_fisica/listar_redeFisica.asp';
	FormEscola.target='iframe_historico';
	FormEscola.submit();
	Abafixa(qual_tab_esta_on);
	Legenda(qual_tab_esta_on);
	return false;
}
function tab7_on(){
	qual_tab_esta_on = 7;
//	if (FormEscola.tipo_escola.value=='Estadual'){
//		window.open( 'Relatorios/listar_alunos.asp?codigo=' + FormEscola.codigo_secretaria.value);
		mudaInformativo( 6 );

		FormEscola.action = '../aluno/listar_alunos.asp?codigo='+FormEscola.codigo_secretaria.value;
		FormEscola.target='iframe_historico';
		FormEscola.submit();
		Abafixa(qual_tab_esta_on);
		Legenda(qual_tab_esta_on);
//	}else{
//		mudaInformativo( 6 );
//		FormEscola.action = 'iframe_vazio.asp';
//		FormEscola.target='iframe_historico';
//		FormEscola.submit();
//	}
	return false;
}
function tab8_on(){
	qual_tab_esta_on = 8;
//	if (FormEscola.tipo_escola.value=='Estadual'){
//		window.open( 'inclui_servico_vigilancia.asp?codigo=' + FormEscola.codigo_secretaria.value);
		mudaInformativo( 7 );
		FormEscola.action = '../servicos/incluir/incluir_servico_vigilancia.asp';
		FormEscola.target='iframe_historico';
		FormEscola.submit();
		Abafixa(qual_tab_esta_on);
		Legenda(qual_tab_esta_on);
//	}else{
//		mudaInformativo( 7 );
//		FormEscola.action = 'iframe_vazio.asp';
//		FormEscola.target='iframe_historico';
//		FormEscola.submit();
//	}
	return false;
}
function tab9_on(){
	FormEscola.action = '../liderClasse/listar_lider_esola.asp';
	mudaInformativo( 9 );
	//FormEscola.action = 'iframe_em_construcao.asp';
	FormEscola.target='iframe_historico';
	FormEscola.submit();
	Abafixa(9);
	Legenda(9);
	return false;
}
function tab10_on(){
	qual_tab_esta_on = 10;
	mudaInformativo( 10 );
	FormEscola.action = '../infraestrutura/listar_infraestrutura.asp';
	FormEscola.target='iframe_historico';
	FormEscola.submit();
	Abafixa(qual_tab_esta_on);
	Legenda(qual_tab_esta_on);
	return false;
}
function tab11_on(){
	qual_tab_esta_on = 11;
	mudaInformativo( 11 );
	FormEscola.action = '../projetos/listar_projetos.asp';
	FormEscola.target='iframe_historico';
	FormEscola.submit();
	Abafixa(qual_tab_esta_on);
	Legenda(qual_tab_esta_on);
	return false;
}
function tab12_on(){
	qual_tab_esta_on = 12;
	mudaInformativo( 12 );
	FormEscola.action = '../faed/listar_faed2.asp';
	FormEscola.target='iframe_historico';
	FormEscola.submit();
	Abafixa(qual_tab_esta_on);
	Legenda(qual_tab_esta_on);
	return false;
}
function tab13_on(tipo){
//	alert(tipo);
	qual_tab_esta_on = 13;
	FormEscola.hdtipo.value = tipo;
	FormEscola.action = '../faed/listar_faed2.asp';
//	alert(FormEscola.action);
	FormEscola.target='iframe_historico';
	FormEscola.submit();
	Abafixa(qual_tab_esta_on);
	Legenda(qual_tab_esta_on);
	return true;
}
function tab15_on(){
	qual_tab_esta_on = 15;
	mudaInformativo( 14 );
	FormEscola.action = '../caixa/listar_caixa_escolar.asp';
	FormEscola.target='iframe_historico';
	FormEscola.submit();
	Abafixa(qual_tab_esta_on);
	Legenda(qual_tab_esta_on);
	return false;
}
function tab16_on(){
	qual_tab_esta_on = 16;
	mudaInformativo( 16 );
	FormEscola.action = '../servidores/listar_servidores_nominal.asp';
	FormEscola.target='iframe_historico';
	FormEscola.submit();
	Abafixa(qual_tab_esta_on);
	Legenda(qual_tab_esta_on);
	return false;
}
function tab17_on(tipo){
	if (tipo == 'nom'){
		FormEscola.action = '../servidores/listar_servidores_nominal.asp';
		FormEscola.target='iframe_historico';
		FormEscola.submit();
		Legenda(16);
	}else if (tipo == 'qtd'){
		FormEscola.action = '../servidores/listar_servidores_qtd_cargo_funcao.asp';
		FormEscola.target='iframe_historico';
		FormEscola.submit();
		Legenda(17);
	}else if (tipo == 'inst'){
		FormEscola.action = '../servidores/listar_servidores_funcao_instrucao.asp';
		FormEscola.target='iframe_historico';
		FormEscola.submit();
		Legenda(17);
	}else if (tipo == 'ced'){
		FormEscola.action = '../servidores/listar_servidores_cedidos.asp';
		FormEscola.target='iframe_historico';
		FormEscola.submit();
		Legenda(17);
	}
	return true;
}
function tab18_on(){
	qual_tab_esta_on = 18;
	mudaInformativo( 18 );
	FormEscola.action = '../documentos/listar_docs.asp';
	FormEscola.target = 'iframe_historico';
	FormEscola.submit();
	Abafixa(qual_tab_esta_on);
	Legenda(qual_tab_esta_on);
	return false;
}
function tab19_on(tipo){
	if (tipo == 'vis'){
		FormEscola.action = '../documentos/listar_docs.asp';
		FormEscola.target = 'iframe_historico';
		FormEscola.submit();
		Legenda(19);
	}else if (tipo == 'env'){
		FormEscola.action = '../documentos/escolher_envio_docs.asp';
		FormEscola.target = 'iframe_historico';
		FormEscola.submit();
		Legenda(19);
	}
	return true;
}
// Alteração colegiado
function tab20_on(){
	qual_tab_esta_on = 20;
	mudaInformativo( 20 );
	FormEscola.action = '../colegiado/listar_atual.asp';
	FormEscola.target='iframe_historico';
	FormEscola.submit();
	Abafixa(qual_tab_esta_on);
	Legenda(qual_tab_esta_on);
	return false;
}
function tab24_on(){
	qual_tab_esta_on = 24;
	mudaInformativo( 2 );
	FormEscola.action = '../processos/listar_processos.asp';
	FormEscola.target='iframe_historico';
	FormEscola.submit();
	Abafixa(qual_tab_esta_on);
	Legenda(qual_tab_esta_on);
	return false;
}
function tab25_on(){
	qual_tab_esta_on = 25;
	mudaInformativo( 25 );
	FormEscola.action = '../licitacao/listar_comissao.asp';
	FormEscola.target='iframe_historico';
	FormEscola.submit();
	Abafixa(qual_tab_esta_on);
	Legenda(qual_tab_esta_on);
	return false;
}
function tab21_on(tipo){
	if (tipo == 'dad'){
		FormEscola.action = '../colegiado/listar_colegiado.asp';
		FormEscola.target='iframe_historico';
		FormEscola.submit();
		Legenda(20);
	}else if (tipo == 'atu'){
		FormEscola.action = '../colegiado/listar_atual.asp';
		FormEscola.target='iframe_historico';
		FormEscola.submit();
		Legenda(20);
	}else if (tipo == 'his'){
		FormEscola.action = '../colegiado/listar_historico.asp';
		FormEscola.target='iframe_historico';
		FormEscola.submit();
		Legenda(20);	
	}else if (tipo == 'reu'){
		FormEscola.action = '../colegiado/reuniao/listar_reuniao.asp';		
		FormEscola.target='iframe_historico';
		FormEscola.submit();
		Legenda(20);	
	}else if (tipo == 'reu2'){
		FormEscola.action = '../colegiado/reuniao2/listar_reuniao.asp';		
		FormEscola.target='iframe_historico';
		FormEscola.submit();
		Legenda(20);		
	}else if (tipo == 'eve'){
		FormEscola.action = '../colegiado/evento/listar_evento.asp';
		FormEscola.target='iframe_historico';
		FormEscola.submit();
		Legenda(20);	
	}else if (tipo == 'ele'){
		qual_tab_esta_on = 21;
		FormEscola.action = '../eleicao/listar_comissao.asp'
		FormEscola.target='iframe_historico';
		FormEscola.submit();
		Abafixa(qual_tab_esta_on);
		Legenda(20);	
	}else if (tipo == 'ges'){		
		FormEscola.action = '../colegiado/Incluir/incluir_atual.asp'
		FormEscola.target='iframe_historico';
		FormEscola.submit();
		Abafixa(qual_tab_esta_on);
		Legenda(20);	
	}
	return true;
}
function tab22_on(tipo){
	if (tipo == 'cal'){
		FormEscola.action = '../eleicao/listar_comissao.asp'
		FormEscola.target='iframe_historico';
		FormEscola.submit();
		Legenda(20);
	}else if (tipo == 'com'){
		FormEscola.action = '../eleicao/listar_part_comissao.asp';
		FormEscola.target='iframe_historico';
		FormEscola.submit();
		Legenda(20);	
	}else if (tipo == 'can'){
		FormEscola.action = '../eleicao/listar_candidatos.asp';
		FormEscola.target='iframe_historico';
		FormEscola.submit();
		Legenda(20);
	}else if (tipo == 'res'){
		FormEscola.action = '../eleicao/menu_relatorio.asp';
		FormEscola.target='iframe_historico';
		FormEscola.submit();
		Legenda(20);	
	} else if (tipo == 'cad'){
		FormEscola.action = '../eleicao/incluir_candidato_atual.asp';
		FormEscola.target='iframe_historico';
		FormEscola.submit();
		Legenda(20);			
	}else if (tipo == 'doc2'){		
		qual_tab_esta_on = 22;
		FormEscola.action = '../eleicao/documentos/listar_docs.asp';
		FormEscola.target='iframe_historico';
		FormEscola.submit();
		mudaInformativo( 20 );
		Abafixa(qual_tab_esta_on);
		Legenda(20);				
	}else if (tipo == 'mod'){
		FormEscola.action = '../eleicao/menu_documentos.asp';
		FormEscola.target='iframe_historico';
		FormEscola.submit();
		Legenda(20);	
	}
	return true;
}
function tab23_on(tipo){			
	qual_tab_esta_on = 9;
	if (tipo == 'lid'){
		FormEscola.action = '../liderClasse/listar_lider_classe.asp';		
		FormEscola.target = 'iframe_historico';
		FormEscola.submit();
		mudaInformativo( 9 );
		Abafixa(qual_tab_esta_on);
		Legenda(9);
	} else if (tipo == 'lidE'){		
		FormEscola.action = '../liderClasse/listar_lider_esola.asp';
		FormEscola.target = 'iframe_historico';
		FormEscola.submit();
		mudaInformativo( 9 );
		Abafixa(qual_tab_esta_on);
		Legenda(9);	
	} else if (tipo == 'jouv'){
		//alert("teste");
		FormEscola.action = '../liderClasse/ouvidor.asp';
		FormEscola.target = 'iframe_historico';
		FormEscola.submit();
		mudaInformativo( 9 );
		Abafixa(qual_tab_esta_on);
		Legenda(9);		
	}else if (tipo == 'rel'){
		FormEscola.action = '../liderClasse/menu_relatorio.asp';
		FormEscola.target = 'iframe_historico';
		FormEscola.submit();
		mudaInformativo( 9 );
		Abafixa(qual_tab_esta_on);
		Legenda(9);
	}	
	return true;
}
function tab26_on(tipo){
	if (tipo == 'com'){
		FormEscola.action = '../licitacao/listar_comissao.asp'
		FormEscola.target='iframe_historico';
		FormEscola.submit();
		Legenda(27);
	}else if (tipo == 'par'){
		FormEscola.action = '../licitacao/listar_atual.asp';
		FormEscola.target='iframe_historico';
		FormEscola.submit();
		Legenda(27);
	}else if (tipo == 'his'){
		FormEscola.action = '../licitacao/listar_historico.asp';
		FormEscola.target='iframe_historico';
		FormEscola.submit();
		Legenda(27);
	}else if (tipo == 'rel'){
		FormEscola.action = '../licitacao/menu_relatorio.asp';
		FormEscola.target='iframe_historico';
		FormEscola.submit();
		Legenda(27);	
	}else if (tipo == 'docE'){
		qual_tab_esta_on = 26;
		FormEscola.action = '../licitacao/documentos/listar_docs.asp';
		FormEscola.target='iframe_historico';
		FormEscola.submit();
		mudaInformativo( 27 );
		Abafixa(qual_tab_esta_on);
		Legenda(27);			
	}
	return true;
}
function tab27_on(tipo){
	if (tipo == 'vis'){
		FormEscola.action = '../licitacao/documentos/listar_docs.asp';
		FormEscola.target = 'iframe_historico';
		FormEscola.submit();
		Legenda(27);
	}else if (tipo == 'env'){
		FormEscola.action = '../licitacao/documentos/escolher_envio_docs.asp';
		FormEscola.target = 'iframe_historico';
		FormEscola.submit();
		Legenda(27);
	}
	return true;
}
function tab28_on(tipo){
	if (tipo == 'vis'){
		FormEscola.action = '../eleicao/documentos/listar_docs.asp';
		FormEscola.target = 'iframe_historico';
		FormEscola.submit();
		Legenda(27);
	}else if (tipo == 'env'){
		FormEscola.action = '../eleicao/documentos/escolher_envio_docs.asp';
		FormEscola.target = 'iframe_historico';
		FormEscola.submit();
		Legenda(27);
	}
	return true;
}

function SubmitIFrame(){
	FormEscola.action = 'consulta_escola.asp';
	FormEscola.target='frame_baixo';
	qual_tab_esta_on = 1;
	FormEscola.submit();
	return false;
}
function AtualizaCadastro(){
	FormEscola.hdcadastro.value = '1';
	FormEscola.action = 'consulta_escola.asp';
	FormEscola.target='frame_baixo';
	FormEscola.submit();
	return true;
}

/*******************************************************************************
				Função que determina apenas o que deve ser digitado no campo de data.
*******************************************************************************/
function SoPermiteEntradaNumerica(valor,campo) {
    	//Determinando o que deve ser colocado no campo
	var dados = "0123456789";//Você escreve aqui o caractéres permitidos
	//'S' é o valor que o usuário escreveu na TextBox  
	var S = valor.value;	
	//var Digitos = ""; 
	//alert(campo.name);
	var temp = ""; //Essa variavel vai ser resultante da comparação
	var digito = ""; //Essa variavel vai servir de auxilio para a comparação
	//Aqui vai ser loop de comparação 
	for (var i=0; i<S.length; i++)
	{
		//'digito' recebe o caracter da posição 'i' da variavel 'S'
		digito = S.charAt(i);
		//Compara se o caracter da variavel 'digito' têm na variavel 'dados'
		if (dados.indexOf(digito)>=0)
		{		
			if (!(event.altKey && S.charAt(i))){
				temp=temp+digito;
			}
		}
	}
	//Retorna o resultado da comparação
	campo.value = temp;
	return;
}	

//usado tambem pelo alterar_cadastro_MTS.asp
function onKeyPressCodigoMEC(e){
	//if (navigator.appName == 'Microsoft Internet Explorer'){
		keycode = e.keyCode ? e.keyCode : e.which ? e.which : e.charCode;
		//se digitou ENTER
		if (keycode==13) {
			if (FormEscola.codigo_escola.value.length==8){
				FormEscola.codigo_secretaria.value = '';
				tab1_on();
				SubmitIFrame();
			}else{
				FormEscola.codigo_escola.focus();
				FormEscola.codigo_escola.select();
				alert("O Código do MEC deve conter 8 digitos!");
			}	
	}
}
function submeteAnexo(){
	if (FormEscola.SeqAnexo != ""){
		FormEscola.codigo_secretaria.value = '';
		tab1_on();
		SubmitIFrame();
	}
}
function RefreshDadosEscola(){
	if (FormEscola.codigo_secretaria.value.length==7){
		FormEscola.codigo_escola.value = '';
		SubmitIFrame();
	}
	else if (FormEscola.codigo_secretaria.value.length<6){
			var inicio = "1100000";
			FormEscola.codigo_secretaria.value= inicio.substring(0,7-FormEscola.codigo_secretaria.value.length)+FormEscola.codigo_secretaria.value;
			FormEscola.codigo_escola.value = '';
			SubmitIFrame();
		}else{
			FormEscola.codigo_secretaria.focus();
			FormEscola.codigo_secretaria.select();
			alert("O Código da SEC inválido!");
		}
}
function onKeyPressCodigoSEC(e){
	//if (navigator.appName == 'Microsoft Internet Explorer'){
		//se digitou ENTER
		keycode = e.keyCode ? e.keyCode : e.which ? e.which : e.charCode;
		if (keycode==13){
			if (FormEscola.codigo_secretaria.value.length==7){
				FormEscola.codigo_escola.value = '';
				tab1_on();
				SubmitIFrame();
			}
			else if (FormEscola.codigo_secretaria.value.length<6){
					var inicio = "1100000";
					FormEscola.codigo_secretaria.value= inicio.substring(0,7-FormEscola.codigo_secretaria.value.length)+FormEscola.codigo_secretaria.value;
					FormEscola.codigo_escola.value = '';
					tab1_on();
					SubmitIFrame();
				}else{
					FormEscola.codigo_secretaria.focus();
					FormEscola.codigo_secretaria.select();
					alert("Código da SEC inválido!");
				}
		}
		//filtra a digitacao p so permitir numeros...
		if (keycode<48 || keycode>57)
			keycode = null;
	//}
	return true;
}
function onBlurCodigoMEC(objeto){
	/**if (objeto.value.length!=8){
		alert("O Código do MEC deve conter 8 digitos!");
		objeto.focus();
		objeto.select();
	}**/
}
function onChangeLista_municipio(){
	FormEscola.codigo_escola.value = '';
	FormEscola.codigo_secretaria.value = '';
	SubmitIFrame();
	return true;
}

//funcoes usadas pelo iFrame...
function TesteIFrame(NomeEscola){
	FormEscola.TextCodigoMunicipio.value = NomeEscola;
}
function MudaTextValuecodigo_escola(codigo){
	FormEscola.codigo_escola.value = codigo;
}
function MudaTextDirec(NomeDirec){
	//var strSub = "Diretoria Regional de Educação - ";
	//if (NomeDirec.substr(0,strSub.length)==strSub) NomeDirec=NomeDirec.substr(strSub.length);
	NomeDirec=NomeDirec.replace(/^\s+/,'').replace(/\s+$/,'');//TRIM
	NomeDirec=NomeDirec.substr(NomeDirec.length-2,NomeDirec.length);//separa somente o numero da direc
	direc.innerHTML=NomeDirec;
}
function MudaTextValuecodigo_secretaria(codigo){
	FormEscola.codigo_secretaria.value = codigo;
}
function MudaTextValuecodigo_SIA(codigo){
	FormEscola.codigo_SIA.value = codigo;
}
function MudaTextTipoEscola(tipo, sit_adm){
	var escola_extinta;
	if (sit_adm=="Extinta") escola_extinta=1;
		else escola_extinta=0;

	escola_extinta=0;	//quando for cadastradas todas as escolas extintas esta linha deverá ser 
						//apagada para que se for EXTINTA nao seja editada...

	FormEscola.tipo_escola.value = tipo;

	if (qual_tab_esta_on==1) tab1_on();
	if (qual_tab_esta_on==2) tab2_on();
	if (qual_tab_esta_on==3) tab3_on();
	if (qual_tab_esta_on==4) tab4_on();
	if (qual_tab_esta_on==5) tab5_on();
	if (qual_tab_esta_on==6) tab6_on();
	if (qual_tab_esta_on==7) tab7_on();
	if (qual_tab_esta_on==8) tab8_on();
	if (qual_tab_esta_on==10) tab10_on();
	if (qual_tab_esta_on==11) tab11_on();
	if (qual_tab_esta_on==12) tab12_on();
	if (qual_tab_esta_on==16) tab16_on();
	if (qual_tab_esta_on==24) tab24_on();
}
function ReSelecionaMunicipio(codigo_municipio){
	onchangeValorOriginal = FormEscola.lista_municipio.onchange;
	FormEscola.lista_municipio.onchange = '';
	for (cont=0; cont<FormEscola.lista_municipio.options.length; cont++){
		if (FormEscola.lista_municipio.options[cont].value == codigo_municipio){
			FormEscola.lista_municipio.options[cont].selected = true;
			break;
		}
	}
	FormEscola.lista_municipio.onchange = onchangeValorOriginal;
}
function ListaAtosLegais(){
	FormEscola.action = 'listar_atos.asp';
	FormEscola.target='iframe_historico';
	FormEscola.submit();
}
function ListaAdm(){
	FormEscola.action = 'listar.asp';
	FormEscola.target='iframe_historico';
	FormEscola.submit();
}
function AbreNovaJanela(endereco){
	window.open(endereco, "tinyWindow", 'width=770,height=470');
}
