/*
 * Arquivo padrão de comandos que são carregados pelo sistema em todas as páginas
 */
$('.topbar-foto').remove();

function OpenFormNewTab(form) {
    var dadosForm = $(form).serializeArray();
    var action = $(form).attr('action');

    $('.aux_form').remove();
    var $newForm = $("<form class='aux_form' action='" + action + "' method='post' target='_blank' style='display:none'></form>");

    $.each(dadosForm, function (index, dados) {
        $newForm.append('<input type="text" name="' + dados.name + '"  value="' + dados.value + '">');
    });

    $('body').append($newForm);
    $('.aux_form').trigger('submit');
}


function modalErro() {
    var data = {
        "component": "returnDefaultFailJson",
        "erro": 1,
        "modal": {
            "type": "error",
            "message": "N\u00e3o foi Poss\u00edvel realizar a opera\u00e7\u00e3o",
            "icon": "<i class=\"glyphicon glyphicon-check\"><\/i>",
            "title": "Falha!",
            "urlRedirect": "",
            "buttonColor": "#F44336"
        }
    }
    modalAlert(JSON.stringify(data), false);
}

function validaCPF(cpf) {

    if (cpf == "") {
        return true
    }
    cpf = cpf.replace(/[^\d]+/g, '');

    if (/^1{11}|2{11}|3{11}|4{11}|5{11}|6{11}|7{11}|8{11}|9{11}|0{11}$/.test(cpf)) {
        return false;
    }
    if (!/^\d{11}$/.test(cpf) && !/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(cpf)) {
        return false;
    }

    var d1 = 0;
    for (var i = 0; i < 9; i++) {
        d1 += (10 - i) * parseInt(cpf.charAt(i), 10);
    }
    d1 = 11 - d1 % 11;
    if (d1 === 10 || d1 === 11) {
        d1 = 0;
    }
    if (d1 + '' !== cpf.charAt(9)) {
        return false;
    }

    var d2 = 0;
    for (i = 0; i < 10; i++) {
        d2 += (11 - i) * parseInt(cpf.charAt(i), 10);
    }
    d2 = 11 - d2 % 11;
    if (d2 === 10 || d2 === 11) {
        d2 = 0;
    }

    return (d2 + '' === cpf.charAt(10));
}

function initDisabledFormGroup() {

    $('.form-group.disabled select,   .form-group.disabled input,   .form-group.disabled textarea').each(function (index) {
        $(this).addClass('disabled');
        $(this).attr('disabled', 'disabled');

        if (this.tagName == 'SELECT' && $(this).attr('removeOption') == '') {
            $(this).find('option:not(:selected)').remove();
        }

    });

    $('.selectpicker').selectpicker('refresh');
    $('select[multiple]').multiSelect('refresh');


}



jQuery(document).ready(function () {


    $(document).on('click', '.alert-confirm-liberar', function (e) {

        e.preventDefault();

        var form = $('form');
        var href = $(this).prop('href');

        var objRegistro = $('#tr' + $(this).attr('target-id'));

        swal({
            title: "Você tem certeza que deseja liberar esse lote?",
            text: "Esta operação não poderá ser desfeita",
            type: "warning",
            showCancelButton: true,
//            confirmButtonColor: "#DD6B55",
            confirmButtonColor: "#4caf50",
            cancelButtonText: "Cancelar",
            confirmButtonText: "Sim, tenho certeza!",
            closeOnConfirm: false
        }, function () {
            $.post(href, function (data) {
                var json = JSON.parse(data);

                var swalAjaxMessage = json.modal.message;
                var swalAjaxType = json.modal.type;
                var swalAjaxIcon = json.modal.icon;
                var swalAjaxTitle = json.modal.title;
                var swalAjaxUrlRedirect = json.modal.urlRedirect;

                if (json.erro == 0) {
                    $('button.confirm').attr("url", swalAjaxUrlRedirect);

                } else {
                    if (form != false) {
                        $('button.confirm').attr("url", swalAjaxUrlRedirect);
                        form.find('button.confirm').removeAttr('disabled');
                    }
                }
                swal(swalAjaxTitle, swalAjaxMessage, swalAjaxType);

                $('button.confirm').on('click', function () {
                    location.href = $(this).attr('url');
                    return false;
                });
            });

        });

        return false;
    });



    //DISABLEDS
    initDisabledFormGroup();

    $('.topbar-foto').attr('src',
            $('.fotoPerfil').attr('src')
            );


    $(document).on('click', '.btn-reset', function (e) {
        $('select').val('');
        $('input:not([type=radio])').val('');
        $('input[type="radio"]').attr('checked', false);
        $('[combodestino]').change();
    });




    $("input, textarea").on("drop", function (e) {
        e.stopPropagation();
        e.preventDefault();
        return false;
    });

//    $('[data-toggle="popover"]').popover({
//        trigger: 'hover'
//    });


    confirm = function (title, text, type, callback) {
        swal({
            title: title,
            text: text,
            type: type,
            showCancelButton: true,
            confirmButtonColor: "#4CAF50",
            cancelButtonColor: "#9a0303",
            cancelButtonText: "Cancelar",
            confirmButtonText: "Sim, confirmo!",
            closeOnConfirm: false,
            html: true

        }, callback);
        return false;
    };

    $('[get-pop-over]').each(function (index) {

        $(this).popover({
            title: $(this).attr('title'),
            trigger: 'hover',
            html: true,
            content: $(this).attr('text'),
            placement: 'top'
        });

    });

    /* ASTERISCO para campos obrigatórios */
    $('.required-field').append('<sup class="required">*</sup>');


    $('#PERFIL_ACESSO_SISTEMA').change(function (e) {

        e.preventDefault();
        $.post('/perfil/selecaoPerfil', {PERFILACESSO: $(this).val()}, function (data) {
            if (data) {
                modalAlert(data, false);
            }

        });


    });
    $('[somente-numero-positivo]').on("keyup paste click", function () {
        validaNumero(this, false, false, false, false, false);
    });


    $(document).on('mouseenter', 'tr[destaque] .info', function () {
        $(this).text('A análise deste item foi iniciada');
    });

    $(document).on('mouseleave', 'tr[destaque] .info', function () {
        $(this).text('?');
    });

    $('.remove_caracter_especial').bind('keypress', function (event) {

        var regex = new RegExp("^[A-zA-Z-0-9]+$");
        var key = String.fromCharCode(!event.charCode ? event.which : event.charCode);
        if (!regex.test(key))

        {
            event.preventDefault();
            return false;
        }
    });
    $('[VALIDA-DATA-FINAL]').bootstrapMaterialDatePicker({format: 'DD/MM/YYYY',
        clearButton: true,
        weekStart: 1,
        time: false
    }).on('change', function (e, date)
    {
        $('[VALIDA-DATA-INICIAL]').bootstrapMaterialDatePicker('setMaxDate', date);
    });

    $('[VALIDA-DATA-INICIAL]').bootstrapMaterialDatePicker({format: 'DD/MM/YYYY',
        clearButton: true,
        weekStart: 1,
        time: false}).on('change', function (e, date)
    {
        $('[VALIDA-DATA-FINAL]').bootstrapMaterialDatePicker('setMinDate', date);
    });
    $('[VALIDA-DATA]').bootstrapMaterialDatePicker({format: 'DD/MM/YYYY',
        clearButton: true,
        weekStart: 1,
        time: false
    });
}

);

function validaNumero(campo, decimal, somente_ponto, precisao, separador, negativo) {
    dec = '';
    if (decimal)
        dec = ',.';
    if (somente_ponto)
        dec = '.';
    var digitos = "-0123456789" + dec;
    if (negativo === false) {
        digitos = "0123456789" + dec;
    }

    var campoTemp;
    var is_replace = false;
    for (var i = 0; i < campo.value.length; i++) {
        campoTemp = campo.value.substring(i, i + 1)
        if (!somente_ponto && campoTemp == ',')
            is_replace = true;
        if (digitos.indexOf(campoTemp) == -1)
            campo.value = campo.value.substring(0, i);
    }
    if (is_replace)
        campo.value = campo.value.replace(',', '.');

    // if (precisao && campo.value.length > 2)
    // campo.value = campo.value.toFixed(precisao);

    if (separador == '.' || separador == ',') {
        if (separador == '.')
            campo.value = campo.value.replace(',', '.');
        else
            campo.value = campo.value.replace('.', ',');
    }
}



setInterval(function () {
   $.post('/reiniciarsessao', null, function (data) {
       console.log('sessão renovada');
   });

}, 300000);


