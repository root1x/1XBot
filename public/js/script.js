var translate;
var language;
var LngObject = null;

document.addEventListener('DOMContentLoaded', function () {
    var $navbarBurgers = Array.prototype.slice.call(document.querySelectorAll('.navbar-burger'), 0);
    if ($navbarBurgers.length > 0) {
        $navbarBurgers.forEach(function ($el) {
            $el.addEventListener('click', function () {
                var target = $el.dataset.target;
                var $target = document.getElementById(target);
                $el.classList.toggle('is-active');
                $target.classList.toggle('is-active');
            });
        });
    }

    $(document).on('click', '.modal-background', function () {
        toggleModal(`#${$(this).parent().attr('id')}`);
    });

    $(document).on('click', '.modal-card .delete, [data-tag="cancel"], [data-tag="no"]', function () {
        toggleModal(`#${$(this).parent().parent().parent().attr('id')}`);
    });

    $(document).on('click', '[data-modal]', function () {
        if ($(this).attr('data-modal') === '#addCommand' || $(this).attr('data-modal') === '#addMessage' || $(this).attr('data-modal') === '#addQuote' || $(this).attr('data-modal') === '#addRegex') {
            $(`${$(this).attr('data-modal')} input`).val('');
            $(`${$(this).attr('data-modal')} textarea`).val('');
            $(`${$(this).attr('data-modal')} select`).val(3).change();
        }
        toggleModal($(this).attr('data-modal'));
    });

    $(document).on('click', '[data-tab-target]', function () {
        var category = $(this).attr('data-tab-target');
        var targetDiv = $($(this).attr('data-tab'));

        $(`[data-tab-target="${category}"]`).removeClass('is-active');
        $(this).addClass('is-active');
        $(`[data-tab-category="${category}"]`).addClass('is-hidden');
        targetDiv.removeClass('is-hidden');
    });

    $(document).on('click', '[data-toggle]', function () {
        var target = $($(this).attr('data-toggle'));
        $(target).prop('disabled') ? $(target).prop('disabled', false) : $(target).prop('disabled', true);
    });

    $(document).on('click', '[data-modal="#editCommand"]', function () {
        var commandInfo = JSON.parse($(this).parent().parent().parent().attr('data-command-info'));
        $('#editCommand #commandID').val(commandInfo['_id']);
        $('#editCommand input[data-tag="command-name"]').val(commandInfo['name']);
        $('#editCommand textarea[data-tag="command-output"]').val(commandInfo['content']);
        $('#editCommand input[data-tag="command-cooldown"]').val(commandInfo['cooldown']);
        $('#editCommand select').val(commandInfo['permission']).change();
    });

    $(document).on('click', '[data-modal="#removeCommand"]', function () {
        var commandInfo = JSON.parse($(this).parent().parent().parent().attr('data-command-info'));
        $('#removeCommand #commandID').val(commandInfo['_id']);
    });

    $(document).on('click', '[data-modal="#editMessage"]', function () {
        var messageInfo = JSON.parse($(this).parent().parent().parent().attr('data-message-info'));
        $('#editMessage #messageID').val(messageInfo['_id']);
        $('#editMessage textarea[data-tag="auto-message"]').val(messageInfo['content']);
        $('#editMessage input[data-tag="auto-message-cooldown"]').val(messageInfo['cooldown']);
    });

    $(document).on('click', '[data-modal="#removeMessage"]', function () {
        var messageInfo = JSON.parse($(this).parent().parent().parent().attr('data-message-info'));
        $('#removeMessage #messageID').val(messageInfo['_id']);
    });

    $(document).on('click', '[data-modal="#editQuote"]', function () {
        var quoteInfo = JSON.parse($(this).parent().parent().parent().attr('data-quote-info'));
        $('#editQuote #quoteID').val(quoteInfo['_id']);
        $('#editQuote textarea[data-tag="quote-content"]').val(quoteInfo['content']);
    });

    $(document).on('click', '[data-modal="#removeQuote"]', function () {
        var quoteInfo = JSON.parse($(this).parent().parent().parent().attr('data-quote-info'));
        $('#removeQuote #quoteID').val(quoteInfo['_id']);
    });

    $(document).on('click', '[data-modal="#editRegex"]', function () {
        var regexInfo = JSON.parse($(this).parent().parent().parent().attr('data-regex-info'));
        $('#editRegex #regexID').val(regexInfo['_id']);
        $('#editRegex textarea[data-tag="regex-expression"]').val(regexInfo['regex']);
        $('#editRegex textarea[data-tag="regex-output"]').val(regexInfo['response']);
        $('#editRegex input[data-tag="regex-cooldown"]').val(regexInfo['cooldown']);
        $('#editRegex select').val(regexInfo['permission']).change();
    });

    $(document).on('click', '[data-modal="#removeRegex"]', function () {
        var regexInfo = JSON.parse($(this).parent().parent().parent().attr('data-regex-info'));
        $('#removeRegex #regexID').val(regexInfo['_id']);
    });

    $(document).on('click', '[data-language]', function () {
        var language = $(this).attr('data-language');
        $.post(`/api/updateLanguage/${currentChannel}`, {
            language: language
        }, function (response) {
            if (response.success) {
                translate.init('data-tag', response.data.language);
                translate.process();
            }
        });
    });

    $(document).on('click', '[data-submit]', function () {
        var targetFormName = $(this).attr('data-submit');
        var targetForm = $(targetFormName);
        $(`${$(this).attr('data-submit')} p[data-tag]`).addClass('is-hidden');
        $.post(`${$(targetForm).attr('action')}/${currentChannel}`, objectifyForm($(targetForm).serializeArray()), function (response) {
            if (response.success) {
                toggleModal(`#${$(targetFormName).parent().parent().attr('id')}`);
                if (targetFormName === '#addCommandForm') {
                    $('#commands .table tbody').append(`<tr data-command-id="${response.data._id}" data-command-info="${JSON.stringify(response.data).split('"').join('&quot;')}"><td class="name">${response.data.name}</td><td class="content">${response.data.content}</td><td class="actions"><p class="field"><a class="button is-small" data-modal="#editCommand"><span class="icon is-small"><i class="fas fa-pencil-alt"></i></span></a> <a class="button is-small" data-modal="#removeCommand"><span class="icon is-small"><i class="fas fa-trash-alt"></i></span></a></p></td></tr>`);
                } else if (targetFormName === '#editCommandForm') {
                    $(`tr[data-command-id="${response.data._id}"]`).attr('data-command-info', JSON.stringify(response.data));
                    $(`tr[data-command-id="${response.data._id}"] .name`).text(`${response.data.name}`);
                    $(`tr[data-command-id="${response.data._id}"] .content`).text(`${response.data.content}`);
                } else if (targetFormName === '#removeCommandForm') {
                    $(`tr[data-command-id="${response.data._id}"]`).remove();
                } else if (targetFormName === '#addQuoteForm') {
                    $('#quotes .table tbody').append(`<tr data-quote-id="${response.data._id}" data-quote-info="${JSON.stringify(response.data).split('"').join('&quot;')}"><td class="addedBy">${response.data.addedBy}</td><td class="content">${response.data.content}</td><td class="actions"><p class="field"><a class="button is-small" data-modal="#editQuote"><span class="icon is-small"><i class="fas fa-pencil-alt"></i></span></a> <a class="button is-small" data-modal="#removeQuote"><span class="icon is-small"><i class="fas fa-trash-alt"></i></span></a></p></td></tr>`);
                } else if (targetFormName === '#editQuoteForm') {
                    $(`tr[data-quote-id="${response.data._id}"]`).attr('data-quote-info', JSON.stringify(response.data));
                    $(`tr[data-quote-id="${response.data._id}"] .content`).text(`${response.data.content}`);
                } else if (targetFormName === '#removeQuoteForm') {
                    $(`tr[data-quote-id="${response.data._id}"]`).remove();
                } else if (targetFormName === '#addRegexForm') {
                    $('#regexModeration .table tbody').append(`<tr data-regex-id="${response.data._id}" data-regex-info="${JSON.stringify(response.data).split('"').join('&quot;')}"><td class="name">${response.data.regex}</td><td class="content">${response.data.response}</td><td class="actions"><p class="field"><a class="button is-small" data-modal="#editRegex"><span class="icon is-small"><i class="fas fa-pencil-alt"></i></span></a> <a class="button is-small" data-modal="#removeRegex"><span class="icon is-small"><i class="fas fa-trash-alt"></i></span></a></p></td></tr>`);
                } else if (targetFormName === '#editRegexForm') {
                    $(`tr[data-regex-id="${response.data._id}"]`).attr('data-regex-info', JSON.stringify(response.data));
                    $(`tr[data-regex-id="${response.data._id}"] .name`).text(`${response.data.regex}`);
                    $(`tr[data-regex-id="${response.data._id}"] .content`).text(`${response.data.response}`);
                } else if (targetFormName === '#removeRegexForm') {
                    $(`tr[data-regex-id="${response.data._id}"]`).remove();
                } else if (targetFormName === '#addMessageForm') {
                    $('#autoMessages .table tbody').append(`<tr data-message-id="${response.data._id}" data-message-info="${JSON.stringify(response.data).split('"').join('&quot;')}"><td class="name">${response.data.content}</td><td class="actions"><p class="field"><a class="button is-small" data-modal="#editMessage"><span class="icon is-small"><i class="fas fa-pencil-alt"></i></span></a> <a class="button is-small" data-modal="#removeMessage"><span class="icon is-small"><i class="fas fa-trash-alt"></i></span></a></p></td></tr>`);
                } else if (targetFormName === '#editMessageForm') {
                    $(`tr[data-message-id="${response.data._id}"]`).attr('data-message-info', JSON.stringify(response.data));
                    $(`tr[data-message-id="${response.data._id}"] .name`).text(`${response.data.content}`);
                    $(`tr[data-message-id="${response.data._id}"] .content`).text(`${response.data.response}`);
                } else if (targetFormName === '#removeMessageForm') {
                    $(`tr[data-message-id="${response.data._id}"]`).remove();
             } else {
                $(`${targetFormName} p[data-tag="${response.error}"]`).removeClass('is-hidden');
             }
            }
        });
    });
});

// Credit: https://stackoverflow.com/questions/1184624/convert-form-data-to-javascript-object-with-jquery/1186309#1186309
function objectifyForm(formArray) {
    var returnArray = {};
    for (var i = 0; i < formArray.length; i++) {
        returnArray[formArray[i]['name']] = formArray[i]['value'];
    }
    return returnArray;
}

function toggleModal(modal) {
    if ($(modal).hasClass('hidden')) {
        $(modal).css('display', 'flex');
        $(modal).removeClass('hidden');
        $(modal).addClass('active');
    } else {
        $(modal).removeClass('active');
        $(modal).addClass('hidden');
        setTimeout(function () {
            $(modal).css('display', 'none');
        }, 200)
    }
}

// Credit: https://www.codeproject.com/Tips/1165561/How-to-Create-a-Multilingual-Application-using-Jav
function Translate() {
    this.init = function (attribute, lng) {
        this.attribute = attribute;
        this.lng = lng;
    }
    this.getItDone = function () {
        var allDom = document.getElementsByTagName('*');
        for (var i = 0; i < allDom.length; i++) {
            var elem = allDom[i];
            var key = elem.getAttribute(_self.attribute);

            if (key != null) {
                if ($(elem).attr('data-variables')) {
                    var variableObject = JSON.parse($(elem).attr('data-variables'));
                    Object.keys(variableObject).forEach(function (name) {
                        if (elem.tagName === 'INPUT' || elem.tagName === 'TEXTAREA')
                            $(elem).attr('placeholder', LngObject[key].split(`{${name}}`).join(variableObject[name]))
                        else
                            elem.innerHTML = LngObject[key].split(`{${name}}`).join(variableObject[name]);
                    });
                } else {
                    if (elem.tagName === 'INPUT' || elem.tagName === 'TEXTAREA')
                        $(elem).attr('placeholder', LngObject[key])
                    else
                        elem.innerHTML = LngObject[key];
                }
            }
        }
    }
    this.process = function () {
        _self = this;
        if (LngObject === null || LngObject['lng-code'] !== this.lng) {
            var xrhFile = new XMLHttpRequest();
            xrhFile.open('GET', `./js/languages/${this.lng}.json`, false);
            xrhFile.onreadystatechange = function () {
                if (xrhFile.readyState === 4) {
                    if (xrhFile.status === 200 || xrhFile.status == 0) {
                        LngObject = JSON.parse(xrhFile.responseText);
                        var allDom = document.getElementsByTagName('*');
                        _self.getItDone();
                    }
                }
            }
            xrhFile.send();
        } else {
            _self.getItDone();
        }
    }
}