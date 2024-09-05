// Copyright (c) 2024, Felipe and contributors
// For license information, please see license.txt

frappe.ui.form.on('Atendimentos', {
    async onload(frm) {
        try {
            let response = await frappe.call({
                method: 'frappe.client.get',
                args: {
                    doctype: 'Configuracoes Gerais',
                }
            });
            let tabelaPrecoPadrao = response.message.tabela_preco_padrao;
            frm.set_value('tabela_precos', tabelaPrecoPadrao);
        } catch (error) {
            console.error('Erro ao buscar configurações gerais:', error);
        }
    },
    refresh: function (frm) {
        // TODO atualizar cadastros / registros
        // Layout Base
        $('button').off('click');
        frm.trigger('update_lista_pedidos');
        frm.disable_save(); // desativa botão salvar de cima

        // STATE: Criado 
        frm.toggle_display('botao_criar_atendimento', (frm.doc.atendimento_state === 'Criado'));
        frm.fields_dict.botao_criar_atendimento.$input.on('click', function () {
            if (!frm.doc.cliente) {
                frappe.msgprint(__('Por favor, preencha o campo Cliente antes de verificar.'));
                return;
            }
            frappe.call({
                method: 'frappe.client.get_list',
                args: {
                    doctype: 'Atendimentos',
                    filters: {
                        cliente: frm.doc.cliente,
                        atendimento_state: ['!=', 'Fechado']
                    },
                    fields: ['name'],
                    limit_page_length: 1 // Limita a 1 registro para verificar se existe algum
                },
                callback: function (data) {
                    if (data.message.length > 0) {
                        frappe.msgprint(__('Já existe um atendimento aberto para este cliente.'));
                    } else {
                        frappe.call({
                            method: 'frappe.client.get_list',
                            args: {
                                doctype: 'Faturamentos',
                                filters: {
                                    cliente: frm.doc.cliente,
                                    faturamento_state: ['!=', 'Pago']
                                },
                                fields: ['name'],
                                limit_page_length: 1 // Limita a 1 registro para verificar se existe algum
                            },
                            callback: function (data) {
                                if (data.message.length > 0) {
                                    frappe.msgprint(__('Existe um faturamento em aberto ou em débito para este Cliente.'));
                                } else {
                                    frm.set_value('atendimento_state', 'Iniciado');
                                    frm.set_value('data_inicio', frappe.datetime.now_datetime());
                                    frm.save();
                                }
                            }
                        })
                    }
                }
            });
        });

        // STATE: Iniciado
        frm.toggle_display('botao_novo_pedido', frm.doc.atendimento_state !== 'Criado' && frm.doc.atendimento_state !== 'Fechado');
        frm.fields_dict.botao_novo_pedido.$input.on('click', function () {
            frappe.call({
                method: 'frappe.client.get_list',
                args: {
                    doctype: 'Pedidos',
                    filters: {
                        cliente: frm.doc.cliente,
                        pedido_state: ['!=', 'Faturado']
                    },
                    fields: ['name'],
                    limit_page_length: 1 // Limita a 1 registro para verificar se existe algum
                },
                callback: function (data) {
                    console.log(data)
                    if (data.message.length > 0) {
                        frappe.msgprint(__('Já existe um Pedido aberto para este cliente.'));
                    } else {
                        frappe.call({
                            method: 'frappe.client.get_list',
                            args: {
                                doctype: 'Faturamentos',
                                filters: {
                                    cliente: frm.doc.cliente,
                                    faturamento_state: ['!=', 'Pago']
                                },
                                fields: ['name'],
                                limit_page_length: 1 // Limita a 1 registro para verificar se existe algum
                            },
                            callback: function (data) {
                                if (data.message.length > 0) {
                                    frappe.msgprint(__('Existe um faturamento em aberto ou em débito para este Cliente.'));
                                } else {

                                    frappe.call({

                                        method: 'millapp.api.criar_registro',
                                        args: {
                                            doctype: 'Pedidos',
                                            campos_valores: JSON.stringify({
                                                'cliente': frm.doc.cliente,
                                                'atendimento': frm.doc.name,
                                                'pedido_state': 'Pre Criado',
                                                'tabela_precos': frm.doc.tabela_precos
                                            })
                                        },
                                        callback: function (response) {
                                            if (response.message) {
                                                window.location.href = `/app/pedidos/${response.message}`;
                                            } else {
                                                frappe.msgprint(__('Não foi possível criar o pedido.'));
                                            }
                                        }
                                    })

                                }
                            }
                        })
                    }
                }
            });
        });

    },

    update_lista_pedidos: function (frm) {
        frappe.call({
            method: 'frappe.client.get_list',
            args: {
                doctype: 'Pedidos',
                filters: {
                    'atendimento': frm.doc.name
                },
                fields: ['name', 'data_criacao', 'data_acerto', 'pedido_state'],
                limit_page_length: 1000
            },
            callback: function (data) {
                let pedidos_html = `
                    <table id="pedidos_table" class="table table-bordered">
                        <thead>
                            <tr>
                                <th><a href="#" class="sort" data-sort="nome" data-order="asc">Nome</a></th>
                                <th><a href="#" class="sort" data-sort="data_criacao" data-order="asc">Data Criação</a></th>
                                <th><a href="#" class="sort" data-sort="data_acerto" data-order="asc">Data Acerto</a></th>
                                <th><a href="#" class="sort" data-sort="estado" data-order="asc">Estado</a></th>
                            </tr>
                        </thead>
                        <tbody>
                `;

                if (data.message && data.message.length > 0) {
                    data.message.forEach(function (pedido) {
                        pedidos_html += `
                            <tr>
                                <td><a href="/app/pedidos/${pedido.name}" target="_blank">${pedido.name || 's/d'}</a></td>
                                <td>${pedido.data_criacao || 's/d'}</td>
                                <td>${pedido.data_acerto || 's/d'}</td>
                                <td>${pedido.pedido_state || 's/d'}</td>
                            </tr>`;
                    });
                } else {
                    pedidos_html += `
                        <tr>
                            <td colspan="4">Nenhum pedido encontrado.</td>
                        </tr>`;
                }

                pedidos_html += '</tbody></table>';

                // Define o HTML da tabela no campo
                frm.set_df_property('lista_pedidos_html', 'options', pedidos_html);
                frm.refresh_field('lista_pedidos_html');

                // Adiciona funcionalidades de ordenação
                frappe.after_ajax(function () {
                    const headers = document.querySelectorAll('#pedidos_table th a.sort');
                    headers.forEach(function (header) {
                        header.addEventListener('click', function (event) {
                            event.preventDefault();
                            const sortField = header.dataset.sort;
                            const currentOrder = header.dataset.order;
                            const newOrder = currentOrder === 'asc' ? 'desc' : 'asc';
                            header.dataset.order = newOrder;

                            const table = document.getElementById('pedidos_table');
                            const tbody = table.querySelector('tbody');
                            const rows = Array.from(tbody.querySelectorAll('tr'));

                            const sortedRows = rows.sort((a, b) => {
                                const aText = a.querySelector(`td:nth-child(${header.parentElement.cellIndex + 1})`).innerText;
                                const bText = b.querySelector(`td:nth-child(${header.parentElement.cellIndex + 1})`).innerText;
                                return (newOrder === 'asc' ? 1 : -1) * aText.localeCompare(bText);
                            });

                            tbody.innerHTML = '';
                            sortedRows.forEach(row => tbody.appendChild(row));
                        });
                    });
                });
            },
            error: function (error) {
                console.error("Erro na chamada:", error);
            }
        });
    }

});
