// Copyright (c) 2024, Felipe and contributors
// For license information, please see license.txt

frappe.ui.form.on("Contatos", {
    onload: function (frm) {
        update_fields_visibility_and_mandatory(frm);
    },
    validate: function (frm) {
        if (frm.doc.pessoa == 'Fisica' || frm.doc.pessoa == 'MEI') {
            if (!validarCPF(frm.doc.cpf)) {
                frappe.msgprint(__('CPF inválido.'));
                frappe.validated = false;
            }
        }
        if (frm.doc.pessoa == 'Juridica' || frm.doc.pessoa == 'MEI') {
            if (!validarCNPJ(frm.doc.cnpj)) {
                frappe.msgprint(__('CNPJ inválido.'));
                frappe.validated = false;
            }
        }
    },
    pessoa: function (frm) {
        update_fields_visibility_and_mandatory(frm);
    },

    cep: function (frm) {
        if (frm.doc.cep) {
            fetch(`https://cep.awesomeapi.com.br/json/${frm.doc.cep}`)
                .then(response => response.json())
                .then(data => {
                    if (data.error) {
                        frappe.msgprint(__('CEP inválido.'));
                    } else {
                        frm.set_value('rua', data.address);
                        frm.set_value('bairro', data.district);
                        frm.set_value('cidade', data.city);
                        frm.set_value('estado', data.state);
                        frm.set_value('latitude', data.lat);
                        frm.set_value('longitude', data.lng);
                        frm.set_value('lat_long_por_api', true);
                    }
                })
                .catch(error => {
                    console.error('Erro:', error);
                    frappe.msgprint(__('Ocorreu um erro ao buscar os dados.'));
                });
        }
    }
});

function update_fields_visibility_and_mandatory(frm) {
    var is_fisica_ou_mei = frm.doc.pessoa == 'Fisica' || frm.doc.pessoa == 'MEI';
    var is_juridica_ou_mei = frm.doc.pessoa == 'Juridica' || frm.doc.pessoa == 'MEI';

    frm.toggle_display('sobrenome', is_fisica_ou_mei);
    frm.toggle_display('cpf', is_fisica_ou_mei);
    frm.toggle_display('rg', is_fisica_ou_mei);
    frm.toggle_display('nascimento', is_fisica_ou_mei);
    frm.toggle_display('cnpj', is_juridica_ou_mei);

    frm.toggle_reqd('sobrenome', is_fisica_ou_mei);
    frm.toggle_reqd('cpf', is_fisica_ou_mei);
    frm.toggle_reqd('nascimento', is_fisica_ou_mei);
    frm.toggle_reqd('cnpj', is_juridica_ou_mei);
}

function validarCPF(cpf) {
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf == '') return false;
    if (cpf.length != 11 ||
        cpf == "00000000000" ||
        cpf == "11111111111" ||
        cpf == "22222222222" ||
        cpf == "33333333333" ||
        cpf == "44444444444" ||
        cpf == "55555555555" ||
        cpf == "66666666666" ||
        cpf == "77777777777" ||
        cpf == "88888888888" ||
        cpf == "99999999999")
        return false;
    // Valida 1o digito
    add = 0;
    for (i = 0; i < 9; i++)
        add += parseInt(cpf.charAt(i)) * (10 - i);
    rev = 11 - (add % 11);
    if (rev == 10 || rev == 11)
        rev = 0;
    if (rev != parseInt(cpf.charAt(9)))
        return false;
    // Valida 2o digito
    add = 0;
    for (i = 0; i < 10; i++)
        add += parseInt(cpf.charAt(i)) * (11 - i);
    rev = 11 - (add % 11);
    if (rev == 10 || rev == 11)
        rev = 0;
    if (rev != parseInt(cpf.charAt(10)))
        return false;
    return true;
}

function validarCNPJ(cnpj) {
    cnpj = cnpj.replace(/[^\d]+/g, '');
    if (cnpj == '') return false;
    if (cnpj.length != 14)
        return false;
    if (cnpj == "00000000000000" ||
        cnpj == "11111111111111" ||
        cnpj == "22222222222222" ||
        cnpj == "33333333333333" ||
        cnpj == "44444444444444" ||
        cnpj == "55555555555555" ||
        cnpj == "66666666666666" ||
        cnpj == "77777777777777" ||
        cnpj == "88888888888888" ||
        cnpj == "99999999999999")
        return false;
    // Valida DVs
    tamanho = cnpj.length - 2
    numeros = cnpj.substring(0, tamanho);
    digitos = cnpj.substring(tamanho);
    soma = 0;
    pos = tamanho - 7;
    for (i = tamanho; i >= 1; i--) {
        soma += numeros.charAt(tamanho - i) * pos--;
        if (pos < 2)
            pos = 9;
    }
    resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (resultado != digitos.charAt(0))
        return false;
    tamanho = tamanho + 1;
    numeros = cnpj.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;
    for (i = tamanho; i >= 1; i--) {
        soma += numeros.charAt(tamanho - i) * pos--;
        if (pos < 2)
            pos = 9;
    }
    resultado = soma % 11 < 2 ? 0 : 11 - soma % 11;
    if (resultado != digitos.charAt(1))
        return false;
    return true;
}

// TODO Verifica se não há um contato já com o mesmo cpf ou cnpj...
// se houer, não permitir salvar o contato, verificar se o contato tem atendimento ativo e se não houver, criar um atendimento para o contato
// TODO Exibir apenas contatos que foram cadastrados pelo usuario + que já tiveram um atendimento pelo usuario