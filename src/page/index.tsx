import React from 'react';
import { hydrate } from 'react-dom';

import { Page, PageProps } from './components';

declare global {
    interface Window {
        initialState: Partial<PageProps>;
    }
}

hydrate(<Page {...window.initialState} />, document.getElementById('app'));
