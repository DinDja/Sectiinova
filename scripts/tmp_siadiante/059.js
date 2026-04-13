function comboDestinoChangeEvent() {

    var elemento = $(this);
    var elementodestino = elemento.attr('combodestino');
    var naoValidaFilho = elemento.attr('nao-valida-filho');
    var controller = elemento.attr('combodestino-controller');
    var defaultOption = '';
    var selecionado = '0';
    var id;
    var param;
    var i;
    var paramUrl = '';

    /**
     *    selecionar itens
     */
    var selecionados = null;
    if (elemento.attr('selecionados') !== undefined) {
        selecionados = elemento.attr('selecionados');
        if (selecionados.length > 0) {
            selecionados = selecionados.split(',');

            selecionados.forEach(function (item) {
                elemento.find('option[value="' + item + '"]').attr('selected', 'selected');
            });
            $('[data-multiselect]').multiSelect('refresh');
        }
    }

    if (elemento.attr('combodestino') != 'false') {

        if (elemento.attr('combodestino-optionpadrao') !== undefined) {
            defaultOption = $(this).attr('combodestino-optionpadrao');

            if (defaultOption !== '') {
                defaultOption = '<option value="">' + defaultOption + '</option>';
            }

        } else {
            defaultOption = '<option value="">Selecione...</option>';
        }


        if (elemento.attr('combodestino-itemselecionado') !== undefined) {
            selecionado = elemento.attr('combodestino-itemselecionado');
        }

        if (elemento.attr('combodestino-parametros') !== undefined) {
            param = elemento.attr('combodestino-parametros');
            param = param.split(',');

            if (Array.isArray(param)) {
                for (i = 0; i < param.length; i++) {
                    paramUrl += '/' + param[i];
                }
            } else {
                paramUrl = param;
            }
        }

        if (elemento.attr('combodestino-parametros-objeto') !== undefined) {
            param = elemento.attr('combodestino-parametros-objeto');
            param = param.split(',');

            if (Array.isArray(param)) {
                for (i = 0; i < param.length; i++) {
                    paramUrl += '/' + $('#' + param[i]).val();
                }
            } else {
                paramUrl = $('#' + param).val();
            }
        }

        if (elemento.attr('combo-callback') !== undefined) {
            call = elemento.attr('combo-callback');
            call = call + '($("#' + elemento.attr('id') + '"))';
            eval(call);
        }



        if (elemento.val() !== null) {

            if (elemento.attr('multiple') === undefined) {
                id = elemento.val();
            } else {
                id = '';
                elemento.find('option:selected').each(function () {
                    id += $(this).attr('value') + ',';
                });
                id = id.substring(0, id.length - 1);
            }
        } else {
            id = '0';
        }

        var combodestino = elementodestino.split(',');
        var combodestinometodo = elemento.attr('combodestino-metodo').split(',');
        var systemurl = $('#system-url').val();
   
        if($('#system-url').val() === undefined){
           systemurl = '';
        }


        $.each(combodestino, function (idx, value) {
            var elementodestino = $('#' + $.trim(value));
            $.ajax({
                url: systemurl + "/" + controller + "/" + $.trim(combodestinometodo[idx]) + "/" + id + "/" + selecionado + paramUrl,
                context: document.body,
                async: false
            }).done(function (data) {

                /**
                 *   carregar conteudo
                 */

                if (elementodestino.attr('multiple') === undefined) {
                    elementodestino.html((defaultOption + data));
                } else {
                    elementodestino.html((data));
                }

                $('.selectpicker').selectpicker('refresh');
                $('[data-multiselect]').multiSelect('refresh');


                const validator = $('form').data('bootstrapValidator');
                if (validator !== undefined) {
                    validator.resetForm();
                }


                // selecionar
                var optionsSelecionados = new Array();
                elemento.find('option:selected').each(function (idx) {
                    optionsSelecionados[idx] = $(this).val();
                });
                elemento.attr('selecionados', optionsSelecionados.join(','));
               
                if(naoValidaFilho=='false' || naoValidaFilho == undefined){
                    elementodestino.change();
                }


            }).fail(function () {
                alert("Falha na tentativa de carregar o combo destino");
            });
        });
    } else {

        var optionsSelecionados = new Array();
        elemento.find('option:selected').each(function (idx) {
            optionsSelecionados[idx] = $(this).val();
        });
        elemento.attr('selecionados', optionsSelecionados.join(','));

    }// fim if combodestino false
}
$(document).ready(function () {

    /**
     * Adicionar seletores no select
     * combo-metodo="empresaListarTodos"
     * combo-optionpadrao="Selecione..."
     * <select id="cboEmpresa"
     *  combo-metodo="empresaListarTodos"
     *  combo-optionpadrao="Selecione"
     *  combodestino="cboCliente"
     *  combodestino-metodo="empresaListarTodos"
     *  combodestino-optionpadrao="Selecione..">
     *
     * combo-metodo : Carrega o resultado com o método do ComboController
     * combo-optionpadrao: valor padrão ( se colocar vazio não carrega nada, se não colocar o seletor ele carrega "Selecione..." e se colocar um valor ele carrega o valor informado )
     */
	 
    $('[combo-metodo]').each(function () {

        var optionPadrao = '<option value="">Selecione...</option>';
        var elemento = $(this);
        var selecionado = '0';
        var id = '0';
        var param;
        var controller = elemento.attr('combo-controller');
        var i;
        var paramUrl = '';

        if ($(this).attr('combo-optionpadrao') !== undefined && $(this).attr('combo-optionpadrao') !== '') {
            optionPadrao = '<option value="">' + optionPadrao + '</option>';
        }

        if (elemento.attr('combo-itemselecionado') !== undefined) {
            selecionado = elemento.attr('combo-itemselecionado');
        }

        if (elemento.attr('combo-parametros') !== undefined) {
            param = elemento.attr('combo-parametros');
            param = param.split(',');

            if (Array.isArray(param)) {
                for (i = 0; i < param.length; i++) {
                    paramUrl += '/' + param[i];
                }
            } else {
                paramUrl = param;
            }
        }

        if (elemento.val() != null) {
            id = elemento.val();
        }

            var systemurl = $('#system-url').val();
       
            if($('#system-url').val() === undefined){
               systemurl = '';
            }

        $.ajax({
            url: systemurl + "/combo/" + elemento.attr('combo-metodo') + "/" + id + "/" + selecionado + paramUrl,
            context: document.body
        }).done(function (data) {
            elemento.find('option').remove();
            elemento.html((optionPadrao + data));
            $('.selectpicker').selectpicker('refresh');
        }).fail(function () {
            alert("Falha na tentativa de carregar o combo origem");
        });
    });


    $('[combodestino]').change(comboDestinoChangeEvent);



});