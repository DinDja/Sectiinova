/*
 * Arquivo padrão de comandos que são carregados pelo sistema em todas as páginas
 */

jQuery(document).ready(function () {

    $('#DATA_NASCIMENTO').mask('99/99/9999');






    window.verifyRecaptchaCallback = function (response) {
        $('input[data-recaptcha]').val(response).trigger('change')
    }

    window.expiredRecaptchaCallback = function () {
        $('input[data-recaptcha]').val("").trigger('change')
    }


    $('#frmLogin')
        .bootstrapValidator({
            message: 'O valor informado não é válido!',
            //live: 'submitted',
            feedbackIcons: {
                valid: 'glyphicon glyphicon-ok',
                invalid: 'glyphicon glyphicon-remove',
                validating: 'glyphicon glyphicon-refresh'
            },
            fields: {
                NOME: {
                    validators: {
                        notEmpty: {
                            message: 'Preencha este campo!'
                        }
                    }
                },
                DATA_NASCIMENTO: {
                    validators: {
                        notEmpty: {
                            message: 'Preencha este campo!'
                        }
                    }
                },
                RES_NOME: {
                    validators: {
                        notEmpty: {
                            message: 'Preencha este campo!'
                        }
                    }
                }
            }
        })
        .on('success.form.bv', function (e) {
            $('button[type="submit"]').removeAttr('disabled');
            e.preventDefault();
            var $form = $(e.target);
            var metodo = $form.attr('href');
            $.post(metodo, $form.serialize(), function (data) {
                modalAlert(data, $form);
                grecaptcha.reset();

            });
        });


});

