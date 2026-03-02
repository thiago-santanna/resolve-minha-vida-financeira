const React = require('react');
const ReactDOMServer = require('react-dom/server');
const CurrencyInput = require('react-currency-input-field').default;

const App = () => {
    return React.createElement(CurrencyInput, {
        intlConfig: { locale: 'pt-BR', currency: 'BRL' },
        decimalsLimit: 2,
        value: 430.53,
        onValueChange: (value, name, values) => {
            console.log('Returned value:', value);
        }
    });
};

const html = ReactDOMServer.renderToString(React.createElement(App));
console.log('HTML:', html);
