/*!
 * jQuery Sec Validate Plugin
 * version: 1.1.0
 * @requires jQuery v1.5 or later & bootstrap.css
 * Author: (c) 2019 Carlivan Silva Pereira, carlivanpereira@gmail.com 
 * http://www.casipe.com.br
 */

if (typeof jQuery === 'undefined') {
    throw new Error('secValidate requires jQuery');
}
(function ($) {
    var version = $.fn.jquery.split(' ')[0].split('.');
    if ((+version[0] < 2 && +version[1] < 9) || (+version[0] === 1 && +version[1] === 9 && +version[2] < 1)) {
        throw new Error('secValidate requires jQuery version 1.9.1 or higher');
    }
}(window.jQuery));

(function ($) {
    "use strict";

    $.fn.secValidate = function (options) {

        const version = '1.2.0';

        // Default $options
        const $options = $.extend({
            actionSelector: null, //Ex."#id_test"
            feedbackIcons: {
                valid: 'glyphicon glyphicon-ok',
                invalid: 'glyphicon glyphicon-remove',
                validating: 'glyphicon glyphicon-refresh'
            },
            liveValidate: true, //true|false
            resetFormSuccess: false, //true|false
            scrollTop: true, //true|false
            fields: {},
            onSubmitSuccess: function (e, callback) {
                if (typeof callback != "undefined")
                    callback(e);
            },
            onSubmitError: function (e, callback) {
                if (typeof callback != "undefined")
                    callback(e);
            },
            success: function (e, callback) {
                if (typeof callback != "undefined")
                    callback(e);
            },
            error: function (callback) {
                if (typeof callback != "undefined")
                    callback();
            }
        }, options);

        const $_this = $(this);

        let $_fields = [];
        let $fieldList = [];
        let $error = null;
        let $targetFieldError = null;

        const callbackOnSubmitSuccess = function (e) {
            return $options.onSubmitSuccess(e);
        };

        const callbackOnSubmitError = function (e) {
            return $options.onSubmitError(e);
        };

        const callbackError = function (e) {
            if ($error === true) {
                return $options.error(e);
            }
        };

        const callbackSuccess = function () {
            if ($error === false) {
                if ($options.resetFormSuccess === true) {
                    resetForm();
                }
                return $options.success($_this);
            }
        };

        const $iconField = {
            ICON_ERROR: $options.feedbackIcons.invalid,
            ICON_SUCCESS: $options.feedbackIcons.valid,
        };

        let arrayField = [];
        $_this.find('input, select, textarea, [name]').each(function (i, e, v) {


            var field = $(this).attr('id');
            var tagName = $(this).prop("tagName");
            var typeField = $(this).attr('type');
            if (tagName == 'SELECT')
                typeField = 'option';
            var strAttr = '#' + field;


            if (typeof typeField != "undefined" && (typeField == 'radio' || typeField == 'checkbox'))
            {
                field = $(this).attr('name');
                strAttr = '[' + field + ']';
                /*
                 if (typeof field != "undefined")
                 {
                 var f = field.split(/\[/);
                 if (f[0] != '')
                 { 
                 strAttr = field;
                 field = f[0];
                 typeField = 'array';
                 }
                 }
                 */
            }

            let isContinue = true;
            if (strAttr != "[undefined]") {
                if (arrayField.indexOf(strAttr) !== -1) {
                    isContinue = false;
                } else {
                    arrayField.push(strAttr)
                }
            }

            if (isContinue && typeof $options.fields[field] != "undefined")
            {
                let opt = {
                    nameAttr: field,
                    strAttr: strAttr,
                    tagName: tagName,
                    typeField: typeField,
                    options: $options.fields[field],
                    isValid: false,
                    onValid: true
                }
                $_fields.push(opt);
                $fieldList[field] = opt;
            }
        })

        $_fields.map(function (e, i, a) {

            let strAttr = e.strAttr;
            if (e.strAttr == '[' + e.nameAttr + ']') {
                strAttr = 'input[name="' + e.nameAttr + '"]';
            }
            let elem = $(strAttr);

            let elemParent = elem.closest('.form-group')
                    .addClass('has-feedback');

            if (e.typeField != 'radio' && e.typeField != 'checkbox')
            {
                if (elem.next().is('i.form-control-feedback')) {
                    elemParent.find('.form-control-feedback').each(function () {
                        $(this).attr('data-sec-validate-icon', e.nameAttr);
                    });
                } else {
                    elem.attr('data-sec-validate-field', e.nameAttr)
                            .after('<i class="form-control-feedback bv-no-label ' + $iconField.ICON_ERROR + '" data-sec-validate-icon="' + e.nameAttr + '" style="display:none"></i>');
                }
            }
            elemParent.append('<small class="help-block" data-sec-validate="' + e.nameAttr + '" style="display:none" ></small>');
        });

        const resetForm = function () {
            $_this.find('[data-sec-validate-icon]')
                    .removeClass($iconField.ICON_ERROR)
                    .removeClass($iconField.ICON_SUCCESS)
                    .hide();
            $_this.find('[data-sec-validate]').html('').hide();
            $error = null;
        };

        const resetField = function (nameField) {
            let validateIcon = $('[data-sec-validate-icon="' + nameField + '"]');
            let validateMsg = $('[data-sec-validate="' + nameField + '"]');
            if (typeof validateIcon != "undefined") {
                validateIcon.removeClass($iconField.ICON_ERROR)
                        .removeClass($iconField.ICON_SUCCESS)
                        .hide();
            }
            if (typeof validateMsg != "undefined") {
                validateMsg.html('').hide();
            }
        };

        const validField = function (param, nameField) {
            console.log($fieldList)
            /*
             if (param === 'off') {
             resetField(nameField);
             $fieldList[nameField].onValid = false;
             } else if (param === 'on') {
             $fieldList[nameField].onValid = true;
             }*/
        };

        const disabledActionSelector = function () {
            let flag = false;
            $_fields.map(function (e, i, a) {
                if (!$fieldList[e.nameAttr].isValid) {
                    flag = true;
                }
            });

            if ($options.actionSelector === null) {
                $_this.find('[type="submit"]').attr('disabled', flag);
            } else {
                $($options.actionSelector).attr('disabled', flag);
            }
        };


        const scrollField = function () {
            if ($targetFieldError !== null)
            {
                try {
                    var top = $targetFieldError.offset().top;
                } catch (e) {
                    var top = $targetFieldError.parent().offset().top;
                }
                $('html, body').animate({
                    scrollTop: top - 150
                }, 1000, function () {
                    //Todo
                });

            }
        }

        const validate = function (el, e, i, a)
        {

            if (!e.onValid)
                return;

            let typeField = e.typeField;
            let tagName = e.tagName;
            let strAttr = e.strAttr;
            if (e.strAttr == '[' + e.nameAttr + ']')
                strAttr = 'input[name="' + e.nameAttr + '"]';

            let validator = (typeof e.options.validators != "undefined") ? e.options.validators : null;
            let elem = $(strAttr);

            elem.unbind('paste keyup focusout keypress');


            if (!elem.is(":visible"))
            {
                elem.removeClass('has-error');
                $('[data-sec-validate="' + e.nameAttr + '"]').hide();
                $('[data-sec-validate-icon="' + e.nameAttr + '"]')
                        .removeClass($iconField.ICON_ERROR)
                        .removeClass($iconField.ICON_SUCCESS);
                $fieldList[e.nameAttr].isValid = true;
                return;
            }

            let elemParent = elem.closest('.form-group').removeClass('has-error');

            let isValue = (elem.val() != '');
            if (typeField == 'radio' || typeField == 'checkbox')
                isValue = elem.is(':checked');
            $fieldList[e.nameAttr].isValid = true;
            if (!isValue && (typeof validator.notEmpty != "undefined"))
            {
                if ('function' === typeof el.preventDefault)
                    el.preventDefault();

                elemParent.addClass('has-error');
                $('[data-sec-validate-icon="' + e.nameAttr + '"]')
                        .removeClass($iconField.ICON_SUCCESS)
                        .addClass($iconField.ICON_ERROR)
                        .show();
                $('[data-sec-validate="' + e.nameAttr + '"]').show().html(validator.notEmpty.message);
                $error = true;
                if ($targetFieldError == null) {
                    $targetFieldError = elem;
                }
                $fieldList[e.nameAttr].isValid = false;
                if ($options.liveValidate === true) {
                    callbackError();
                }
            }


            if (typeof validator.callback != "undefined")
            {
                if ('function' === typeof validator.callback.callback) {
                    let res = validator.callback.callback(elem.val());
                    if (res.valid === false)
                    {
                        if ('function' === typeof el.preventDefault)
                            el.preventDefault();
                        elemParent.addClass('has-error');
                        $('[data-sec-validate-icon="' + e.nameAttr + '"]')
                                .removeClass($iconField.ICON_SUCCESS)
                                .addClass($iconField.ICON_ERROR)
                                .show();
                        $('[data-sec-validate="' + e.nameAttr + '"]').show().html(res.message);
                        $error = true;
                        if ($targetFieldError == null) {
                            $targetFieldError = elem;
                        }
                        $fieldList[e.nameAttr].isValid = false;
                        if ($options.liveValidate === true) {
                            callbackError();
                        }
                    }
                }
            }
            const actionEvent = (tagName == 'INPUT' || tagName == 'TEXTAREA') ? 'keyup paste' : 'change';

            elem.on(actionEvent, function (el) {

                elemParent.addClass('focused');
                let value = elem.val();
                if (value.length)
                {
                    elemParent.removeClass('has-error');
                    $('[data-sec-validate="' + e.nameAttr + '"]').hide();
                    $('[data-sec-validate-icon="' + e.nameAttr + '"]')
                            .removeClass($iconField.ICON_ERROR)
                            .addClass($iconField.ICON_SUCCESS);
                    
                    
                            elem.addClass('border border-success');
                    
                    
                    $fieldList[e.nameAttr].isValid = true;
                    if ($options.liveValidate === true) {
                        callbackSuccess();
                    }

                }
            }).on('change paste keyup', function () {

                if ((el.type == 'paste' || el.type == 'keyup') && tagName != 'SELECT') {
                    return;
                }
                if (elem.val().length)
                {
                    elemParent.removeClass('has-error');
                    $('[data-sec-validate="' + e.nameAttr + '"]').hide();
                    $('[data-sec-validate-icon="' + e.nameAttr + '"]')
                            .removeClass($iconField.ICON_ERROR)
                            .addClass($iconField.ICON_SUCCESS);
                    
                    elem.addClass('border border-success');
                    
                    $error = false;
                    if ($options.liveValidate === true) {
                        callbackSuccess();
                    }
                    $fieldList[e.nameAttr].isValid = true;
                }

            });

            if ($options.liveValidate === true)
            {
                elem.on('focusout change paste', e, function (el) {

                    if ((el.type == 'focusout' || el.type == 'paste') && tagName != 'TEXT') {
                        return;
                    }
                    if (el.type == 'paste' && tagName != 'SELECT') {
                        return;
                    }
                    validate($($options.actionSelector), e);
                    $error = null;

                    callbackError();
                    callbackSuccess();
                });
            }
            disabledActionSelector();

        }

        if ($options.actionSelector === null)
        {
            $_this.on('submit', function (elem) {
                $error = false;
                $_fields.map(function (e, i, a) {
                    validate(elem, e, i, a);
                });
                if ($error) {
                    if ($options.scrollTop == true) {
                        scrollField();
                    }
                    callbackOnSubmitError($(this));
                } else {
                    callbackOnSubmitSuccess($(this));
                }
                $targetFieldError = null;
                return !$error;
            });
        } else {

            $_this.on('click', $options.actionSelector, function (elem) {
                $error = false;
                $_fields.map(function (e, i, a) {
                    validate(elem, e, i, a);
                });
                if ($error) {
                    if ($options.scrollTop == true) {
                        scrollField();
                    }
                    callbackOnSubmitError($(this));
                } else {
                    callbackOnSubmitSuccess($(this));
                }
                $targetFieldError = null;
                return !$error;
            });
        }

        return {
            resetForm: function ()
            {
                resetForm();
            },
            resetField: function (nameField)
            {
                if (nameField.length) {
                    resetField(nameField);
                }
            },
            validField: function (param, nameField)
            {
                if (nameField.length) {
                    validField(param, nameField);
                }
            }
        }
    };

}(jQuery));     