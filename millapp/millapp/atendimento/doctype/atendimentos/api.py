import frappe

@frappe.whitelist()
def criar_pedido(cliente, atendimento):
    novo_pedido = frappe.get_doc({
        'doctype': 'Pedidos',
        'cliente': cliente,
        'atendimento': atendimento,
        'pedido_state': 'Pre Criado'
    })
    novo_pedido.insert(ignore_permissions=True)
    return novo_pedido.name