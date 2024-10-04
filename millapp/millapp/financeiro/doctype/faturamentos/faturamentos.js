// Copyright (c) 2024, Felipe and contributors
// For license information, please see license.txt

frappe.ui.form.on("Faturamentos", {
    refresh(frm) {
        document.querySelectorAll('button').forEach(button => {
            button.removeEventListener('click', () => { });
        });

        frm.fields_dict.botao_novo_pagamento.$input.on('click', () => {
            Pagamento.setup(frm);
        });
        frm.fields_dict.botao_calcular_desconto.$input.on('click', () => {
            calcular_desconto(frm);
        });

        frm.fields_dict['pagamentos'].grid.wrapper.find('.grid-add-row').hide();

        frm.fields_dict['pagamentos'].grid.wrapper.find('.grid-row').each(function () {
            $(this).find('input').attr('readonly', true);
        });
    },

});

function verificar_valor_pagamento(frm, valor_adicionado) {
    calcular_valor_restante(frm);
    if (valor_adicionado > frm.doc.valor_restante) {
        frappe.msgprint(__('O valor adicionado é maior que o valor restante.'));
        return false;
    }
    return true;
};

function atualizar_valor_bruto_fatura(frm) {
    let total = 0;
    frm.doc.artigos_faturados.forEach(item => {
        total += item.valor_bruto;
    });
    frm.set_value('valor_bruto_fatura', total);
    calcular_valor_restante(frm);
};

async function calcular_desconto(frm) {
    // verificar se o usuario pode editar desconto
    const tipo_faturamento = frm.doc.origem;
    const edita_desconto = false
    const valor_bruto_fatura = frm.doc.valor_bruto_fatura;
    let desconto_aplicado = 0;

    if (edita_desconto) {
        // criar prompt para inserir desconto
    } else {
        const descontos = await frappe.call({
            method: 'millapp.api.get_descontos',
            args: {
                tipo: tipo_faturamento
            }
        });
        descontos.message.forEach(desconto => {
            if (valor_bruto_fatura >= desconto.de && (valor_bruto_fatura <= desconto.ate || desconto.ate == 0)) {
                desconto_aplicado = desconto.pc_desconto;
            }
        });
    }

    const valor_desconto = (valor_bruto_fatura * desconto_aplicado) / 100;
    const valor_liquido = valor_bruto_fatura - valor_desconto;

    frm.set_value('desconto_pc', desconto_aplicado);
    frm.set_value('desconto_moeda', valor_desconto);
    frm.set_value('valor_liquido_fatura', valor_liquido);
    calcular_valor_restante(frm);
}

function calcular_valor_pago(frm) {
    let total = 0;
    frm.doc.pagamentos.forEach(pagamento => {
        total += pagamento.valor;
    });
    frm.set_value('total_pago', total);
    frm.refresh_field('total_pago');
    calcular_valor_restante(frm);
};

function calcular_valor_restante(frm) {
    const valor_restante = frm.doc.valor_liquido_fatura - frm.doc.total_pago;
    frm.set_value('valor_restante', valor_restante);
    frm.refresh_field('valor_restante');
};

const Pagamento = {
    dialog: null, // Adicione uma propriedade para armazenar o diálogo

    async setup(frm) {
        console.log('setup');
        this.frm = frm;

        // Verificar se o diálogo já foi criado
        if (!this.dialog) {
            const dialog = new frappe.ui.Dialog({
                title: 'Valor restante: R$' + frm.doc.valor_restante,
                'fields': [
                    {
                        "fieldname": "tipo",
                        "fieldtype": "Select",
                        "label": "Tipo",
                        "options": "A Vista\nA Prazo",
                        change: function () {
                            if (dialog.get_value('tipo') == 'A Vista') {
                                dialog.fields_dict['metodo'].df.options = 'Dinheiro\nDébito\nPix';
                                dialog.fields_dict['metodo'].refresh();
                            } else if (dialog.get_value('tipo') == 'A Prazo') {
                                dialog.fields_dict['metodo'].df.options = 'Crédito\nCheque\nBoleto\nDepósito';
                                dialog.fields_dict['metodo'].refresh();
                            }
                        }
                    },
                    {
                        'label': 'Forma de Pagamento',
                        'fieldname': 'metodo',
                        'fieldtype': 'Select',
                        'options': '',
                        'change': function () {
                            if (dialog.get_value('metodo') == 'Cheque') {
                                // Lógica adicional para cheque
                            }
                        }
                    },
                    {
                        "fieldname": "valor",
                        "fieldtype": "Currency",
                        "label": "Valor"
                    },
                    {
                        "fieldname": "data",
                        "fieldtype": "Date",
                        "label": "Data",
                        "default": frappe.datetime.now_date()
                    },
                ],
                async primary_action() {
                    dialog.hide();
                    // verificar se o valor do pagamento é maior que o valor restante ou o valor é 0
                    if (dialog.get_value('valor') > frm.doc.valor_restante || dialog.get_value('valor') == 0) {
                        frappe.msgprint('O valor do pagamento não pode ser maior que o valor restante.');
                        return;
                    }
                    try {
                        await Pagamento.registrar_pagamento(dialog.get_values(), frm);
                        // TODO criar registro de cheques
                        calcular_valor_pago(frm);
                        calcular_valor_restante(frm);
                        if (frm.doc.valor_restante == 0) {
                            frm.set_value('faturamento_state', 'Pago');
                            frappe.msgprint('Faturamento Quitado!');
                        } else {
                            frappe.msgprint('Pagamento registrado com sucesso.');
                        }
                        await frm.save();
                    } catch (error) {
                        frappe.msgprint('Erro ao registrar pagamento');
                    }
                },
            });

            // Aplicar a classe CSS personalizada ao título do diálogo
            $(dialog.$wrapper).find('.modal-title').addClass('dialog-title-blue');

            // Armazenar a referência ao diálogo no objeto Pagamento
            this.dialog = dialog;
        }
        // Limpar os campos do diálogo
        this.dialog.set_value('tipo', '');
        this.dialog.set_value('metodo', '');
        this.dialog.set_value('valor', '');

        // Atualizar o título do diálogo com o valor restante atual
        this.dialog.set_title('Valor restante: R$' + frm.doc.valor_restante);
        this.dialog.show();
    },

    async registrar_pagamento(dados, frm) {
        return new Promise((resolve, reject) => {
            try {
                const campos_pagamento = {
                    tipo: dados.tipo,
                    metodo: dados.metodo,
                    valor: dados.valor,
                    data: dados.data,
                };
                console.log(campos_pagamento);
                const novaLinha = frm.add_child('pagamentos', campos_pagamento);
                frm.refresh_field('pagamentos');
                resolve(novaLinha);
            } catch (error) {
                console.error('Erro ao registrar pagamento:', error);
                reject(error);
            }
        });
    },
}
// TODO adicionar configuracao de tipos de pagamento disponiveis para cada usuario
// TODO ao finalizar pagamento, voltar para pagina de atendimento e atualizar o status do faturamento no pedido
// TODO criar doctype e logica de boletos
