(function () {
	const DEFAULT_TABLE = 'customers';
	const DEFAULT_SELECT = '*';

	const DEFAULT_URL = 'https://poghdicqjjrtxucuoqev.supabase.co';
	const DEFAULT_KEY = 'sb_publishable_-jDBMc58Msbi22Rys16pAQ_T3Q2CJ8I';

	window.SUPABASE_URL = window.SUPABASE_URL || DEFAULT_URL;
	window.SUPABASE_KEY = window.SUPABASE_KEY || DEFAULT_KEY;

	function resolveSupabaseClient() {
		if (window.supabase && typeof window.supabase.createClient === 'function') {
			return window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
		}

		if (typeof supabase !== 'undefined' && supabase && typeof supabase.createClient === 'function') {
			return supabase.createClient(window.SUPABASE_URL, window.SUPABASE_KEY);
		}

		if (typeof supabaseClient !== 'undefined' && supabaseClient && typeof supabaseClient.from === 'function') {
			return supabaseClient;
		}

		if (window.supabaseClient && typeof window.supabaseClient.from === 'function') {
			return window.supabaseClient;
		}

		return null;
	}

	class CustomerModule {
		constructor(options = {}) {
			this.client = options.client || resolveSupabaseClient();
			this.table = options.table || DEFAULT_TABLE;
			this.select = options.select || DEFAULT_SELECT;

			if (!this.client) {
				throw new Error('No se pudo inicializar el cliente de Supabase para customers.');
			}
		}

		normalizePayload(payload = {}, { partial = false } = {}) {
			if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
				throw new Error('Los datos del cliente deben enviarse como un objeto válido.');
			}

			const aliasMap = {
				documentType: 'document_type',
				documentNumber: 'document_number',
				isActive: 'is_active',
				createAt: 'create_at',
				updateAt: 'update_at'
			};
			const allowedFields = [
				'name',
				'document_type',
				'document_number',
				'email',
				'phone',
				'address',
				'city',
				'notes',
				'is_active',
				'create_at',
				'update_at'
			];
			const normalized = {};

			Object.entries(payload).forEach(([key, rawValue]) => {
				const fieldName = aliasMap[key] || key;

				if (!allowedFields.includes(fieldName)) {
					return;
				}

				let value = rawValue;

				if (typeof value === 'string') {
					value = value.trim();
				}

				if (fieldName === 'email' && value) {
					value = value.toLowerCase();
				}

				if (fieldName === 'is_active') {
					normalized[fieldName] = value === true || value === 1 || value === 'true';
					return;
				}

				normalized[fieldName] = value;
			});

			if (!partial && !normalized.name) {
				throw new Error('El nombre del cliente es obligatorio.');
			}

			if (!partial && normalized.is_active === undefined) {
				normalized.is_active = true;
			}

			return normalized;
		}

		async getCurrentUser() {
			if (!this.client.auth) {
				throw new Error('Debes iniciar sesión para consultar clientes.');
			}

			const { data, error } = await this.client.auth.getUser();

			if (error) {
				throw error;
			}

			if (!data || !data.user) {
				throw new Error('Debes iniciar sesión para consultar clientes.');
			}

			return data.user;
		}

		applyFilters(query, filters = {}) {
			Object.entries(filters).forEach(([key, value]) => {
				if (value !== undefined && value !== null && value !== '') {
					query = query.eq(key, value);
				}
			});

			return query;
		}

		applySearch(query, search = '') {
			const cleanedSearch = search.trim();

			if (!cleanedSearch) {
				return query;
			}

			const searchTerm = cleanedSearch.replace(/'/g, "''");
			return query.or(
				`name.ilike.%${searchTerm}%,document_number.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`
			);
		}

		async list(options = {}) {
			const {
				filters = {},
				search = '',
				orderBy = null,
				ascending = false,
				limit = null
			} = options;

			const currentUser = await this.getCurrentUser();
			let query = this.client.from(this.table).select(this.select);
			query = query.eq('created_by', currentUser.id);
			query = this.applyFilters(query, filters);
			query = this.applySearch(query, search);

			if (orderBy) {
				query = query.order(orderBy, { ascending });
			}

			if (limit) {
				query = query.limit(limit);
			}

			const { data, error } = await query;

			if (error) {
				throw error;
			}

			return data || [];
		}

		async getAll(options = {}) {
			return this.list(options);
		}

		async getById(id) {
			if (!id) {
				throw new Error('Debe indicar el identificador del cliente.');
			}

			const currentUser = await this.getCurrentUser();
			const { data, error } = await this.client
				.from(this.table)
				.select(this.select)
				.eq('id', id)
				.eq('created_by', currentUser.id)
				.single();

			if (error) {
				throw error;
			}

			return data;
		}

		async getByDocument(documentNumber) {
			if (!documentNumber) {
				throw new Error('Debe indicar el número de documento del cliente.');
			}

			const currentUser = await this.getCurrentUser();
			const { data, error } = await this.client
				.from(this.table)
				.select(this.select)
				.eq('document_number', documentNumber.trim())
				.eq('created_by', currentUser.id)
				.maybeSingle();

			if (error) {
				throw error;
			}

			return data;
		}

		async create(payload) {
			const preparedPayload = this.normalizePayload(payload);
			const currentUser = await this.getCurrentUser();
			preparedPayload.created_by = currentUser.id;

			if (!preparedPayload.create_at) {
				preparedPayload.create_at = new Date().toISOString();
			}

			const { data, error } = await this.client
				.from(this.table)
				.insert(preparedPayload)
				.select(this.select)
				.single();

			if (error) {
				throw error;
			}

			return data;
		}

		async update(id, payload) {
			if (!id) {
				throw new Error('Debe indicar el identificador del cliente.');
			}

			const currentUser = await this.getCurrentUser();
			const preparedPayload = this.normalizePayload(payload, { partial: true });
			preparedPayload.update_at = new Date().toISOString();

			const { count, error } = await this.client
				.from(this.table)
				.update(preparedPayload, { count: 'exact' })
				.eq('id', id)
				.eq('created_by', currentUser.id);

			if (error) {
				throw error;
			}

			if (count === 0) {
				throw new Error('No se actualizó el cliente: el registro no existe o no tienes permiso para modificarlo.');
			}

			return true;
		}

		async softDelete(id) {
			return this.update(id, { is_active: false });
		}

		async activate(id) {
			return this.update(id, { is_active: true });
		}

		async remove(id) {
			if (!id) {
				throw new Error('Debe indicar el identificador del cliente.');
			}

			const currentUser = await this.getCurrentUser();
			const { error } = await this.client
				.from(this.table)
				.delete()
				.eq('id', id)
				.eq('created_by', currentUser.id);

			if (error) {
				throw error;
			}

			return true;
		}

		async count(options = {}) {
			const { filters = {}, search = '' } = options;
			const currentUser = await this.getCurrentUser();
			let query = this.client.from(this.table).select('*', { count: 'exact', head: true });
			query = query.eq('created_by', currentUser.id);
			query = this.applyFilters(query, filters);
			query = this.applySearch(query, search);

			const { count, error } = await query;

			if (error) {
				throw error;
			}

			return count || 0;
		}
	}

	const client = resolveSupabaseClient();

	window.CustomerModule = CustomerModule;
	window.CustomerService = new CustomerModule({ client });
	window.customers = window.CustomerService;

	window.KingdomNexus = window.KingdomNexus || {};
	window.KingdomNexus.customers = window.CustomerService;
})();
