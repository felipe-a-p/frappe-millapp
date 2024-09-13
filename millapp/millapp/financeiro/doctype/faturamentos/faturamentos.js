// Copyright (c) 2024, Felipe and contributors
// For license information, please see license.txt

frappe.ui.form.on("Faturamentos", {
    refresh(frm) {
        frm.fields_dict.botao_novo_pagamento.$input.on('click', () => {
            Pagamento.setup();
        });
    },
});

function atualizar_valor_bruto_fatura(frm) {
    let total = 0;
    frm.doc.artigos_faturados.forEach(item => {
        total += item.valor_bruto;
    });
    frm.set_value('valor_bruto_fatura', total);
};

function calcular_valor_pago(frm) {
    let total = 0;
    frm.doc.pagamentos.forEach(pagamento => {
        total += pagamento.valor;
    });
    frm.set_value('total_pago', total);
};

const Pagamento = {
    setup: function () {
        var d = new frappe.ui.Dialog({
            'fields': [
                {
                    'label': 'Tipo de Pagamento',
                    'fieldname': 'tipo',
                    'fieldtype': 'Select',
                    'options': 'A Vista\nA Prazo',
                    change: function () {
                        if (d.get_value('tipo') == 'A Vista') {
                            d.fields_dict['metodo'].df.options = 'Dinheiro\nDébito\nPix';
                            d.fields_dict['metodo'].refresh();
                        } else if (d.get_value('tipo') == 'A Prazo') {
                            d.fields_dict['metodo'].df.options = 'Crédito\nCheque\nBoleto\nDepósito';
                            d.fields_dict['metodo'].refresh();
                        }
                    }
                },
                {
                    'label': 'Forma de Pagamento',
                    'fieldname': 'metodo',
                    'fieldtype': 'Select',
                    'options': '',
                    'change': function () {
                        // TODO TERMINAR
                        if (d.get_value('metodo') == 'Cheque') {
                            // adicionar campos de cheque
                            d.fields_dict['banco'].toggle(true);
                            d.fields_dict['agencia'].toggle(true);
                            d.fields_dict['conta'].toggle(true);
                            d.fields_dict['numero'].toggle(true);
                            d.fields_dict['data_compensacao'].toggle(true);
                        } else if (d.get_value('metodo') == 'Boletos') {
                            // adicionar campos de boleto
                        }
                    }
                },
                { 'fieldname': 'valor', 'fieldtype': 'Currency' },
                { 'fieldname': 'data', 'fieldtype': 'Date', 'default': frappe.datetime.nowdate() },
                { 'fieldname': 'banco', 'fieldtype': 'Data', 'label': 'Banco', 'hidden': true },
                { 'fieldname': 'agencia', 'fieldtype': 'Data', 'label': 'Agência', 'hidden': true },
                { 'fieldname': 'conta', 'fieldtype': 'Data', 'label': 'Conta', 'hidden': true },
                { 'fieldname': 'numero', 'fieldtype': 'Data', 'label': 'Número', 'hidden': true },
                { 'fieldname': 'data_compensacao', 'fieldtype': 'Date', 'label': 'Data de Compensação', 'hidden': true },
            ],
            primary_action: function () {
                d.hide();
                console.log(d.get_values());
            }
        });
        d.show();
    },

    adicionar_pagamento_: function () {

    }
}
// TODO adicionar configuracao de tipos de pagamento disponiveis para cada usuario
// TODO ao finalizar pagamento, voltar para pagina de atendimento
// TODO criar doctype e logica de boletos
