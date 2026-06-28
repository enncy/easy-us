import { start } from './utils/start';
import * as Utils from './utils';
import * as Render from './render/render';
import * as Elements from './elements';
import * as Interfaces from './interfaces';

const EUS = {
	start,
	...Utils,
	...Render,
	...Elements,
	...Interfaces
};

export default EUS;
