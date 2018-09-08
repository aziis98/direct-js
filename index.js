const Direct = { };

Direct.Properties = {
	parseValue(string, type) {
		if (type === 'int') {
			return parseInt(string);
		}
		else if (type === 'number') {
			return parseFloat(string);
		}
		else if (type === 'string') {
			return string;
		}
		else if (Direct.Properties.parseValue.extensions) {
			// Add extension parsing...
		}

		throw 'Illegal type, undefined type: "' + type + '"';
	}
}

Direct.Templating = { };

Direct.Templating.render = (stringTemplate, scope) => {
	return stringTemplate.replace(/@([a-zA-Z]+)/g, (_, name) => {
		return scope[name];
	});
}

Direct.Templating.link = function ($root, $el, deps) {
	const template = $el.innerText;

	(Array.isArray(deps) ? deps : [deps]).forEach(dep => {
		$root.addEventListener('attr-' + dep + '-changed', e => {
			$el.innerText = Direct.Templating.render(template, $root.props);
		});

		$el.innerText = Direct.Templating.render(template, $root.props);
	});
}

Direct.register = $template => {
	const name = $template.getAttribute('id');
	const propDesc = Array.from($template.attributes)
						  .filter(({ name }) => name !== 'id')
						  .map(({name, value}) => [name, value]);

	const $script = $template.content.querySelector('script');
	const initFn = new Function($script.innerHTML);
	$template.content.removeChild($script);

	customElements.define(name, class extends HTMLElement {
		
		static get observedAttributes() {
			return propDesc.map(([name, type]) => name);
		}

		constructor() {
			super();

			this.props = { };

			propDesc.forEach(([name, type]) => {
				Object.defineProperty(this.props, name, {
					get: () => {
						return Direct.Properties.parseValue(this.getAttribute(name), type);
					},
					set: (newValue) => {
						this.setAttribute(name, '' + newValue);
					}
				})
			});
		}

		connectedCallback() {
			this.attachShadow({ mode: 'open' });
			this.shadowRoot.appendChild(document.importNode($template.content, true));

			this.ids = Object.assign(
				...Array.from(this.shadowRoot.querySelectorAll('[id]'))
						.map($el => ({ [$el.getAttribute('id')]: $el }))
			)

			initFn.call(this);
		}

		attributeChangedCallback(name, oldValue, newValue) {
			const eventName = 'attr-' + name + '-changed';
			const e = new CustomEvent(eventName, { oldValue, newValue });
			this.dispatchEvent(e);
		}

	});
}

Direct.init = () => {
	document.querySelectorAll('template[id]').forEach(Direct.register);
}