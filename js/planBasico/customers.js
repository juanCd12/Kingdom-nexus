(function () {
  class CustomerPage {
    constructor() {
      this.form = document.getElementById('customerForm');
      this.editId = document.getElementById('customerEditId');
      this.message = document.getElementById('customerMessage');
      this.tableBody = document.getElementById('customerTableBody');
      this.cancelButton = document.getElementById('cancelCustomerEdit');
      this.submitButton = document.getElementById('submitCustomerButton');
      this.service = window.KingdomNexus?.customers || window.customers;
      this.messageTimeout = null;
    }

    initialize() {
      this.form.addEventListener('submit', (event) => this.handleSubmit(event));
      this.tableBody.addEventListener('click', (event) => this.handleTableClick(event));
      this.cancelButton.addEventListener('click', () => this.resetForm());
      this.loadCustomers();
    }

    showMessage(message, type = 'info') {
      window.clearTimeout(this.messageTimeout);
      this.message.textContent = message;
      this.message.className = `supplier-message visible ${type}`;

      if (type === 'success') {
        this.messageTimeout = window.setTimeout(() => {
          this.message.textContent = '';
          this.message.className = 'supplier-message';
        }, 4000);
      }
    }

    resetForm() {
      this.form.reset();
      this.editId.value = '';
      document.getElementById('customerStatus').value = 'true';
      this.submitButton.textContent = 'Guardar cliente';
      this.cancelButton.hidden = true;
    }

    getPayload() {
      return {
        name: document.getElementById('customerName').value.trim(),
        document_type: document.getElementById('customerDocumentType').value.trim(),
        document_number: document.getElementById('customerDocumentNumber').value.trim(),
        email: document.getElementById('customerEmail').value.trim(),
        phone: document.getElementById('customerPhone').value.trim(),
        address: document.getElementById('customerAddress').value.trim(),
        city: document.getElementById('customerCity').value.trim(),
        notes: document.getElementById('customerNotes').value.trim(),
        is_active: document.getElementById('customerStatus').value === 'true'
      };
    }

    escapeHtml(value) {
      return String(value ?? '').replace(/[&<>"']/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      })[character]);
    }

    renderCustomers(rows = []) {
      if (!rows.length) {
        this.tableBody.innerHTML = `
          <tr>
            <td colspan="8" class="empty-row">Sin clientes cargados.</td>
          </tr>
        `;
        return;
      }

      this.tableBody.innerHTML = rows.map((customer) => {
        const isActive = customer.is_active === true;
        const statusLabel = isActive ? 'Activo' : 'Inactivo';
        const statusClass = isActive ? 'active' : 'inactive';
        const action = isActive ? 'deactivate' : 'activate';
        const actionLabel = isActive ? 'Desactivar' : 'Activar';
        const actionClass = isActive ? 'delete' : 'activate';
        const customerId = this.escapeHtml(customer.id);

        return `
          <tr>
            <td>${this.escapeHtml(customer.name || '-')}</td>
            <td>${this.escapeHtml(customer.document_type || '-')}</td>
            <td>${this.escapeHtml(customer.document_number || '-')}</td>
            <td>${this.escapeHtml(customer.email || '-')}</td>
            <td>${this.escapeHtml(customer.phone || '-')}</td>
            <td>${this.escapeHtml(customer.city || '-')}</td>
            <td><span class="status-chip ${statusClass}">${statusLabel}</span></td>
            <td>
              <div class="supplier-actions-cell">
                <button class="icon-button edit" type="button" data-action="edit" data-id="${customerId}">Editar</button>
                <button class="icon-button ${actionClass}" type="button" data-action="${action}" data-id="${customerId}">${actionLabel}</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    async loadCustomers() {
      if (!this.service) {
        this.showMessage('No se pudo inicializar el servicio de clientes.', 'error');
        return;
      }

      try {
        this.showMessage('Cargando clientes...', 'info');
        const customers = await this.service.list({ orderBy: 'create_at', ascending: false });
        this.renderCustomers(customers);
        this.showMessage(`Se cargaron ${customers.length} clientes.`, 'success');
      } catch (error) {
        console.error(error);
        const status = error?.status || error?.code;
        const message = status === 403 || status === '42501'
          ? 'Supabase bloqueó la consulta por políticas RLS o porque la tabla no existe. Revisa public.customers y sus permisos.'
          : error?.message || 'Error al cargar clientes.';
        this.showMessage(message, 'error');
      }
    }

    async handleSubmit(event) {
      event.preventDefault();

      if (!this.service) {
        this.showMessage('El servicio de clientes no está disponible.', 'error');
        return;
      }

      const payload = this.getPayload();

      if (!payload.name) {
        this.showMessage('El nombre del cliente es obligatorio.', 'error');
        return;
      }

      try {
        if (this.editId.value) {
          await this.service.update(this.editId.value, payload);
          this.showMessage('Cliente actualizado correctamente.', 'success');
        } else {
          await this.service.create(payload);
          this.showMessage('Cliente guardado correctamente.', 'success');
        }

        this.resetForm();
        await this.loadCustomers();
      } catch (error) {
        console.error(error);
        this.showMessage(error?.message || 'No se pudo guardar el cliente.', 'error');
      }
    }

    fillForm(customer) {
      document.getElementById('customerName').value = customer.name || '';
      document.getElementById('customerDocumentType').value = customer.document_type || '';
      document.getElementById('customerDocumentNumber').value = customer.document_number || '';
      document.getElementById('customerEmail').value = customer.email || '';
      document.getElementById('customerPhone').value = customer.phone || '';
      document.getElementById('customerAddress').value = customer.address || '';
      document.getElementById('customerCity').value = customer.city || '';
      document.getElementById('customerNotes').value = customer.notes || '';
      document.getElementById('customerStatus').value = String(customer.is_active === true);
      this.editId.value = customer.id;
      this.submitButton.textContent = 'Actualizar cliente';
      this.cancelButton.hidden = false;
      document.getElementById('customerName').focus();
    }

    async handleTableClick(event) {
      const button = event.target.closest('[data-action]');

      if (!button || !button.dataset.id || !this.service) {
        return;
      }

      const { action, id } = button.dataset;

      if (action === 'edit') {
        try {
          const customer = await this.service.getById(id);
          this.fillForm(customer);
          this.showMessage('Editando cliente seleccionado.', 'info');
        } catch (error) {
          console.error(error);
          this.showMessage('No se pudo cargar la información del cliente.', 'error');
        }
        return;
      }

      if (action === 'deactivate' || action === 'activate') {
        const isDeactivation = action === 'deactivate';
        const confirmation = isDeactivation
          ? '¿Deseas desactivar este cliente?'
          : '¿Deseas activar este cliente?';

        if (!window.confirm(confirmation)) {
          return;
        }

        try {
          if (isDeactivation) {
            await this.service.softDelete(id);
          } else {
            await this.service.activate(id);
          }

          this.showMessage(`Cliente ${isDeactivation ? 'desactivado' : 'activado'} correctamente.`, 'success');
          this.resetForm();
          await this.loadCustomers();
        } catch (error) {
          console.error(error);
          this.showMessage(error?.message || 'No se pudo cambiar el estado del cliente.', 'error');
        }
      }
    }
  }

  const customerPage = new CustomerPage();
  customerPage.initialize();
})();