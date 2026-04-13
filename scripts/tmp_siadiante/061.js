
function modalAlert(data, form) {

    var json = JSON.parse(data);

    swal({
        title: json.modal.title,
        text: json.modal.message,
        allowEscapeKey: false,
        html: true,
        type: json.modal.type,
        showCancelButton: false,
        confirmButtonColor: json.modal.buttonColor, //"#37a53b",
        confirmButtonText: json.modal.buttonName,
        closeOnConfirm: true,
//        timer: 2000,

    }, function () {

        if (json.erro == 0 && json.modal.urlRedirect.length > 0) {
            location.href = json.modal.urlRedirect;
        } else {
            if (form != false) {
                form.find('.btn-salvar').removeAttr('disabled');
            }
        }
    });


}

function modalAlertDefault(message, typeModal, confirmButtonText) {

    var buttonColor = '';
    var titleModal = '';

    if (typeModal == 'error') {
        buttonColor = '#F44336';
        titleModal = 'Falha';
    } else if (typeModal == 'success') {
        buttonColor = '#37a53b';
        titleModal = 'Sucesso!';
    } else if (typeModal == 'warning') {
        buttonColor = '#F8BB86';
        titleModal = 'Alerta!';
    } else if (typeModal == 'info') {
        buttonColor = '#C9DAE1';
        titleModal = 'Aviso!';
    } else {
        alert('typeModal não definido!');
    }

    swal({
        title: titleModal,
        allowEscapeKey: false,
        text: message,
        type: typeModal,
        html: true,
        showCancelButton: false,
        confirmButtonColor: buttonColor,
        confirmButtonText: confirmButtonText,
        closeOnConfirm: true,
//        timer: 2000,

    });
}

function modalUrlDefault(url, width, height, confirmButtonText, customClass = '', reloadBefore = false) {


    swal({
        title: null,
        allowEscapeKey: false,
        html: true,
        text: '<iframe src="' + url + '" width="' + width + '" height="' + height + '" frameborder="0"><p>Seu navegador não supota iframe.</p></iframe>',
        showCancelButton: false,
        confirmButtonColor: '#F44336',
        confirmButtonText: confirmButtonText,
        closeOnConfirm: true,
        customClass: customClass
    });

    if (reloadBefore) {
        $('.sa-confirm-button-container button.confirm').on('click', function () {
            location.reload();
        });
    }

    if (height == 'auto' || height == '') {
        $('.sweet-alert iframe').attr('height', $('.sweet-alert').height() - 40);
    }
    
    if (width == 'auto' || width == '') {
        $('.sweet-alert iframe').attr('width', $('.sweet-alert').width() - 40);
    }

}

$('.modalUrlDefault').on('click', function () {

    var attrModal = $(this);
    swal({
        title: null,
        allowEscapeKey: false,
        html: true,
        text: '<iframe src="' + attrModal.attr('mUrl') + '" width="' + attrModal.attr('mWidth') + '" height="' + attrModal.attr('mHeight') + '" frameborder="0"><p>Seu navegador não supota iframe.</p></iframe>',
        showCancelButton: false,
        confirmButtonColor: '#F44336',
        confirmButtonText: attrModal.attr('mConfirmButtonText'),
        closeOnConfirm: true,
        customClass: attrModal.attr('mCustomClass')
    });



    if (attrModal.attr('reloadBefore') !== undefined) {
        $('.sa-confirm-button-container button.confirm').on('click', function () {
            location.reload();
        });
    }

    if (attrModal.attr('mHeight') == 'auto' || attrModal.attr('mHeight') == '') {
        $('.sweet-alert iframe').attr('height', $('.sweet-alert').height() - 40);
    }
    
    if (attrModal.attr('mWidth') == 'auto' || attrModal.attr('mWidth') == '') {
        $('.sweet-alert iframe').attr('width', $('.sweet-alert').width() - 40);
    }


});




