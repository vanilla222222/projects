function circ(x, y, r) {
	return `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`;
}

const EYE = (x, y, r = 1) => ['#141414', circ(x, y, r)];
const BARK = '#6b4a2e';

const ICONS = {
	grass: [
		['dark', 'M8 30c0-8-3-14-6-16 4 2 7 7 8 16z M20 30c1-7 4-13 9-16-4 4-6 9-7 16z'],
		['body', 'M12 30c-1-9 0-17 3-24 0 8 0 15 1 24z M16 30c1-8 3-14 7-19-2 6-3 12-4 19z'],
		['light', 'M10 30c0-6 1-11 3-15-1 5-1 10-1 15z M24 30c0-4 1-8 4-10-2 3-2 6-2 10z'],
	],
	reed: [
		['body', 'M11 30c-3-4-6-8-8-10 3 1 7 4 9 8z M17 30c2-6 6-11 10-13-3 3-6 8-8 13z'],
		['dark', 'M11 30V9 M17 30V6 M23 30V12', 1.4],
		['#7a4e2d', 'M11 8c1 0 1.6.6 1.6 1.6v5c0 1-.6 1.6-1.6 1.6S9.4 15.6 9.4 14.6v-5C9.4 8.6 10 8 11 8z M17 5c1 0 1.7.6 1.7 1.6v6c0 1-.7 1.6-1.7 1.6s-1.7-.6-1.7-1.6v-6C15.3 5.6 16 5 17 5z M23 11.5c1 0 1.5.6 1.5 1.5v4c0 1-.5 1.5-1.5 1.5s-1.5-.5-1.5-1.5v-4c0-.9.5-1.5 1.5-1.5z'],
		['light', 'M14 30c0-5-1-9-3-12 3 2 4 7 4 12z'],
	],
	moss: [
		['body', 'M2 30c0-4 2-6 5-6 1-2 3-3 5-3 2-2 5-2 7 0 2 0 4 1 5 3 3 0 6 2 6 6z'],
		['dark', 'M2 30c1-2 3-3 5-3s4 1 5 3z M16 30c1-2 3-3 5-3 3 0 6 1 7 3z'],
		['dark', 'M14 21v-5 M21 22v-4', 0.9],
		['light', circ(10, 24, 1.1) + circ(18, 22.5, 1) + circ(24.5, 25.5, 1) + circ(14, 15.5, 0.9) + circ(21, 17.5, 0.9)],
	],
	shrub: [
		[BARK, 'M15 23h2v7h-2z'],
		['body', 'M5 25c-3-3-2-9 3-10 0-5 5-8 9-6 3-3 9-1 9 4 4 1 6 7 2 11-1 1-3 2-6 2H9c-2 0-3-0-4-1z'],
		['dark', 'M4.5 24c2 2 5 2.5 8 2.5h8c3 0 6-.5 8-3-5 1.5-19 1.5-24 .5z'],
		['light', circ(11, 14, 2) + circ(18, 11, 1.5) + circ(23, 16, 1.2)],
		['#c43f55', circ(9, 20, 1.1) + circ(16, 18, 1.1) + circ(22, 21, 1.1) + circ(13, 23, 1)],
	],
	cactus: [
		['body', 'M13 30V8c0-2 1.4-3 3-3s3 1 3 3v22z M13 18.5H9c-1.5 0-2.5-1-2.5-2.5v-4.5c0-1 .6-1.6 1.5-1.6s1.6.6 1.6 1.6v4H13z M19 21h4v-6c0-1 .7-1.6 1.6-1.6S26 14 26 15v6.5c0 1.5-1 2.5-2.5 2.5H19z'],
		['dark', 'M16.8 7v23 M8 12v3', 0.9],
		['light', 'M14.4 9v19', 0.8],
		['#f07aa0', circ(16, 4.6, 1.6)],
	],
	tree: [
		[BARK, 'M14 30v-9l-3-3 1-1 3 2v-4h2v5l3-3 1 1-4 4v8z'],
		['body', 'M16 3c5 0 8 3 8 6 3 1 5 4 4 7-1 3-4 4-7 4H11c-3 0-6-1-7-4-1-3 1-6 4-7 0-3 3-6 8-6z'],
		['dark', 'M4 16c1 3 4 4 7 4h10c3 0 6-1 7-4-3 2-6 2-12 2S7 18 4 16z'],
		['light', circ(12, 8.5, 2.2) + circ(19, 7, 1.6) + circ(8.5, 13, 1.3)],
	],
	conifer: [
		[BARK, 'M15 25h2v5h-2z'],
		['body', 'M16 2l6 8h-3l6 7h-3l6 8H4l6-8H7l6-7h-3z'],
		['dark', 'M16 2l6 8h-3l6 7h-3l6 8H16z'],
		['light', 'M16 2l-3.5 5 3.5-1.5z M11 11l-2.5 3.5L12 13z'],
	],
	palm: [
		['#8a6a45', 'M15 30c0-7 1-14 3-19h2c-2 5-3 12-3 19z'],
		['dark', 'M16.3 26h2.2 M16.8 22h2 M17.3 18h2 M18 14.5h1.8', 0.8],
		['body', 'M19 11c-4-4-10-5-15-2 5-1 9 0 13 3z M19 11c4-4 9-5 12-2-4-1-8 0-11 3z M19 11c-3 0-7 2-10 7 3-3 6-4 10-5z M19 11c3 1 6 3 8 8-3-3-5-5-9-6z M19 11c0-3 2-7 5-8-2 2-3 5-3 8z'],
		['light', 'M19 11c-2-3-5-6-9-6 3 1 6 3 8 6z M19 11c2-2 4-4 7-4-2 1-4 3-6 5z'],
		[BARK, circ(18, 13, 1.2) + circ(20.4, 13.2, 1.2)],
	],
	algae: [
		['body', 'M6 30c-2-5 2-8 0-13-1-3 1-6 3-6-1 3 1 5 1 8 0 4-3 7-1 11z M15 30c-2-6 3-10 1-16-1-3 1-6 3-7-1 4 1 6 1 10s-3 8-2 13z M24 30c-1-4 2-7 1-11 0-3 1-5 3-5-1 3 0 5 0 7 0 4-2 6-2 9z'],
		['dark', 'M7 29c-1-4 1-7 0-11 M16 29c-1-5 2-9 1-14 M25 29c0-3 1.5-6 1-9', 0.8],
		['light', circ(10, 8, 1.2) + circ(21, 5, 1) + circ(27.5, 11, 0.8)],
	],
	kelp: [
		['dark', 'M11 30c1-2 3-3 5-3s4 1 5 3z'],
		['body', 'M14 30c-2-6 3-10 1-16s2-10 3-13c1 3-1 7 0 12s-2 10-1 17z M16 20c3-2 7-2 9 0-3 0-6 1-9 2z M15 13c-3-2-7-2-9 0 3 0 6 1 9 2z M17 7c2-2 5-2 7-1-2 0-5 1-7 2z M15 25c-3-1-6 0-8 2 3-1 5-1 8 0z'],
		['light', circ(16, 20.5, 1.4) + circ(15, 13.5, 1.3) + circ(17, 7.5, 1.1)],
	],
	plankton: [
		['body', circ(10, 12, 5) + circ(21, 10, 4) + circ(17, 21, 6)],
		['dark', circ(6, 24, 1.8) + circ(27, 19, 1.5) + circ(26, 26, 1.1)],
		['light', circ(8.6, 10.4, 1.5) + circ(19.8, 8.6, 1.2) + circ(15, 18.6, 2)],
		['dark', circ(11, 13, 1.2) + circ(22, 11, 1) + circ(18.5, 22.5, 1.6)],
	],

	rabbit: [
		['dark', 'M9 26.5h6v2H9z M18 26.5h6v2h-6z'],
		['dark', 'M20 11c-1.5-4-1-9 1.5-9s2 5 .5 9z'],
		['body', 'M6 22c0-5 4-9 10-9 4 0 7 2 8 5l1 4c0 3-2 5-5 5H9c-2 0-3-2-3-5z'],
		['body', circ(23, 14, 5) + 'M23 10c0-4 2-7 4-7s1 4-1 8z'],
		['light', circ(6, 19, 2.6) + 'M11 24h8c0 1.4-1 2.2-2 2.2h-4c-1 0-2-.8-2-2.2z'],
		['#e8a0a8', circ(28, 15.5, 0.8)],
		EYE(25, 13),
	],
	deer: [
		['dark', 'M9 19h2v10H9z M12.5 19h2v10h-2z M20 19h2v10h-2z M23.5 19h2v10h-2z'],
		['body', 'M7 14c0-2 2-4 5-4h9c3 0 5 2 5 4v3c0 2-2 4-4 4H11c-2 0-4-2-4-4z'],
		['body', 'M21 12l3.5-6c1-2 3-2 4-1l2.5 2.3c1 1 .3 2.2-1 2.2h-2l-2.5 5z'],
		['dark', 'M25.5 5l-2-4 M25.5 5l2.5-4 M24.4 3l-2.4-.6 M27.3 2.6l2.3-.8', 1.3],
		['light', 'M11 18h10c0 1.5-1 2.5-2 2.5h-6c-1 0-2-1-2-2.5z M5.5 11.5l3 1.5-2 2z'],
		['light', circ(12, 13, 0.9) + circ(15.5, 12.2, 0.9) + circ(18.5, 13.4, 0.9)],
		EYE(27, 7),
	],
	bison: [
		['dark', 'M7 22h3.5v7H7z M11.5 22H15v7h-3.5z M19 22h3.5v7H19z M23.5 22H27v7h-3.5z'],
		['body', 'M3 17c0-5 3-8 8-8h6c4 0 7 3 8 6v7H6c-2 0-3-2-3-5z'],
		['dark', 'M15 8c5-2 10 0 12 4 2 3 3 7 3 10h-6c-3 0-6-3-8-7z'],
		['dark', 'M25 14c2 0 5 1 5 4v4c0 2-2 3-3 3s-3-1-3-3z'],
		['body', 'M3 14c-1.5 1-2 3-1.5 5 .8-1 1.3-2 2-2.5z'],
		['light', 'M26.5 13.5c.8-2.5 3-3 3.8-2.6-.8.3-1.8 1.4-2.2 3z'],
		['light', 'M7 20.5h11v1.5H7z'],
		EYE(27.5, 16.5, 0.9),
	],
	mouse: [
		['dark', 'M8 23c-3 0-5-1.5-6-4.5', 1.2],
		['dark', 'M11 24.5h3v2h-3z M20 24.5h3v2h-3z'],
		['body', 'M7 22c0-5 4-8 9-8 4 0 7 2 9 5l3 2.4c.3 1.8-1.7 2.6-4 2.6H9c-1 0-2-1-2-2z'],
		['light', circ(19.5, 13.5, 3.6)],
		['dark', circ(19.5, 13.5, 1.8)],
		['light', 'M12 23h9c0 .9-.5 1.4-1.5 1.4h-6c-1 0-1.5-.5-1.5-1.4z'],
		['#e8a0a8', circ(28.3, 21.3, 0.9)],
		EYE(24.5, 18.2, 0.9),
	],
	boar: [
		['dark', 'M8.5 22h3v6h-3z M13 22h3v6h-3z M20 22h3v6h-3z M24 22h2.5v6H24z'],
		['body', 'M4 17c0-5 4-8 10-8h8c4 0 7 3 8 6l1 2v2c0 2-1 3-3 3H8c-2 0-4-2-4-5z'],
		['dark', 'M7 11c3-3 10-4 15-2l-2 2c-4-1-8 0-12 1z M21 9.5l2-4.5 2.5 5z'],
		['body', 'M4.5 14c-2 0-3 1.5-3 3 1 0 2-.5 2.5-1z'],
		['light', 'M28 15.5h2.5c.8 0 1.2.5 1.2 1.2v2.6c0 .7-.4 1.2-1.2 1.2H28z M8 20h14v1.5H8z'],
		['#f3ead2', 'M27 20c1 0 2-1 2-3l1 1c0 2-1 3-3 3z'],
		EYE(25.5, 14.5),
	],
	bear: [
		['dark', 'M5.5 23h4.5v6H5.5z M17.5 23H22v6h-4.5z'],
		['body', 'M3 20c0-7 5-12 12-12 5 0 8 2 10 4h2c2 0 4 2 4 4v2c0 1-1 2-2 2h-3l-1.5 6H6c-2 0-3-2-3-6z'],
		['dark', circ(21.5, 9.5, 2.6)],
		['dark', 'M8 10c3-2 7-2.5 10-2-3 .8-6 2-8 3.5z'],
		['light', 'M26.5 15h3c1 0 1.5.5 1.5 1.5S30.5 18 29.5 18h-3z M8 24h10v1.5H8z'],
		['#141414', circ(31, 16, 0.9)],
		EYE(25.5, 13.5),
	],
	fox: [
		['body', 'M9 16c-4 0-7 3-8 7 3 1 6 0 8-2z'],
		['light', 'M1 23c.6-1.4 1.6-2.3 3-2.6l-.6 3.1c-1 .2-1.8 0-2.4-.5z'],
		['dark', 'M10 20h2v8h-2z M13.5 20h2v8h-2z M21 20h2v8h-2z M24.5 20h2v8h-2z'],
		['body', 'M8 15c0-2 2-3 4-3h10c2 0 4 1 4 3v4c0 1-1 2-2 2H10c-1 0-2-1-2-2z'],
		['body', 'M22.5 13l2.2-6 2.3 3.5h1l2-3.5 1 5.5 1.5 2.5c.4.9-.2 1.4-1.1 1.5l-5 .7-3-2z'],
		['dark', 'M24.7 7l1 3 M30 7l-.7 3', 1],
		['light', 'M25 17c1.4 0 3 .2 4-.4l-2 3.4-2.6-.8z'],
		EYE(28, 11.5, 0.9),
	],
	wolf: [
		['body', 'M8 13c-3 1-5 4-6 8l2.3 1c1-3 3-5 5-6z'],
		['dark', 'M9 19h2.5v10H9z M13 19h2.5v10H13z M21 19h2.5v10H21z M24.5 19H27v10h-2.5z'],
		['body', 'M7 13c0-2 2-4 5-4h11c2 0 4 2 4 4v5c0 1-1 2-2 2H9c-1 0-2-1-2-2z'],
		['dark', 'M10 9.5c3-1.5 7-1.5 11-.5l-1 2c-3-.8-6-.8-9 0z'],
		['body', 'M22 10l2-5 2 3h1.5l1.5-3 1 5 2 3c.5 1 0 2-1 2h-4l-2 1-3-3z'],
		['light', 'M27 12h4c.6 0 1 .5.9 1l-.4.8H27z M11 17.5h11V19H11z'],
		EYE(27.5, 10, 0.9),
	],
	bigcat: [
		['body', 'M7 16c-3 0-5-2-5-6 0-1 1.2-1.1 1.3 0 .2 3 1.7 4.2 3.7 4.2z'],
		['dark', 'M8 20h3v8H8z M12 20h3v8h-3z M21 20h3v8h-3z M25 20h3v8h-3z'],
		['body', 'M6 15c0-2 2-4 5-4h12c3 0 4 2 4 4v4c0 1-1 2-2 2H8c-1 0-2-1-2-2z'],
		['body', circ(27, 11, 4.5)],
		['dark', circ(24.8, 6.8, 1.6)],
		['dark', circ(11, 15, 1.2) + circ(14.8, 13.4, 1) + circ(18, 16, 1.2) + circ(21, 13.5, 1) + circ(9, 12.8, 0.8)],
		['light', 'M28 13h3.5c0 1.5-1 2.5-2.5 2.5S28 14.5 28 13z M10 19h13v1.5H10z'],
		EYE(28.2, 10, 0.95),
	],

	fish: [
		['dark', 'M8 16L2 10v12z'],
		['body', 'M7 16c3-6 9-8 15-8 5 0 8 4 9 8-1 4-4 8-9 8-6 0-12-2-15-8z'],
		['light', 'M10 18c4 3 8 4 12 4 3 0 5-1 7-3-6 1-13 1-19-1z'],
		['dark', 'M14 9c2-3 5-4 8-3l-2 3z M15 23l2 3 2-2.6z'],
		['dark', 'M21 11c1.5 3 1.5 7 0 10', 1],
		['#f4f4ef', circ(25, 14, 2)],
		EYE(25.4, 14),
	],
	turtle: [
		['light', 'M8 20l-4 5 6-2z M21 20l5 5-7-2z'],
		['light', 'M24 17c2-2 5-2 6 0 1 2-1 3-3 3h-3z M4 20l-2.5 1.5L4 22z'],
		['body', 'M4 20c0-6 5-10 11-10s11 4 11 10z'],
		['dark', 'M15 10.5V20 M9.5 12l1.8 8 M20.5 12l-1.8 8 M5 16.2h20', 1.1],
		['dark', 'M3 19.5h24v2H3z'],
		EYE(27.5, 17.3, 0.8),
	],
	crab: [
		['dark', 'M9.5 21l-5.5 4.5 M9 19l-6.5 1 M22.5 21l5.5 4.5 M23 19l6.5 1', 1.6],
		['dark', 'M7 11.5l3 5.5 M25 11.5l-3 5.5', 1.8],
		['body', 'M3 9c0-3 3-5 5-4l-1 3 2 1c0 2-2 4-4 4-1 0-2-2-2-4z M29 9c0-3-3-5-5-4l1 3-2 1c0 2 2 4 4 4 1 0 2-2 2-4z'],
		['dark', 'M13.5 14.5V11 M18.5 14.5V11', 1],
		['body', 'M7 19c0-4 4-6 9-6s9 2 9 6-4 6-9 6-9-2-9-6z'],
		['light', 'M10.5 17c2.5-2.2 8.5-2.2 11 0-3.5-1-7.5-1-11 0z'],
		['#141414', circ(13.5, 10.5, 1.3) + circ(18.5, 10.5, 1.3)],
	],
	pike: [
		['dark', 'M6 16L1 11v10z'],
		['dark', 'M8.5 12.5l3-3.5 2.5 3z M10 19.5l2 3.5 3-2.5z'],
		['body', 'M5 16c3-3 9-5 16-5 5 0 9 2 11 5-2 3-6 5-11 5-7 0-13-2-16-5z'],
		['light', 'M8 17.5c5 2 10 2.5 14 2.5 4 0 7-1 9-3.5-8 1.5-15 1.5-23 1z'],
		['dark', 'M12 12.5v7 M15 12v8 M18 11.7v8.4', 0.9],
		['#141414', 'M27 17.2l5-1', 0.6],
		['#f4f4ef', circ(26.5, 14.4, 1.4)],
		EYE(26.8, 14.4, 0.8),
	],
	shark: [
		['body', 'M7 15L1 6c2 0 4 2 7 7z M7 17l-4 6c2 0 3-1 5-4z'],
		['dark', 'M13.5 11l3-7c1 0 2 1 2 3l1.5 4z'],
		['body', 'M4 16c4-4 11-6 18-6 5 0 8 2 10 5l-1 1c-2 2-5 4-10 4-7 0-13-1-17-4z'],
		['light', 'M9 17c5 2 11 3 16 2.5 3-.3 5-1.5 6-3-6 1-15 1.5-22 .5z'],
		['dark', 'M17 18l-3.5 6 6.5-5z'],
		['dark', 'M22.5 13v4 M24 13v4 M25.5 13.2v3.5', 0.8],
		EYE(27.2, 13.8, 0.9),
	],

	dot: [['body', circ(16, 16, 11)], ['light', circ(12.5, 12.5, 3.5)]],
	ring: [['#ffffff', circ(16, 16, 13.5), 2.6]],
	plant: [['body', 'M15 30c0-8 0-14 1-18h1.5c-1 4-1 10-.5 18z M16 14C12 14 7 10 7 4c5 0 9 4 9.5 9.5z M17 12c1-5 4-8 9-8 0 5-3 9-8.5 9.5z']],
	paw: [['body', circ(16, 20, 6) + circ(9, 12, 2.6) + circ(14, 8.5, 2.6) + circ(19.5, 8.8, 2.6) + circ(24, 12.5, 2.6)]],
	wave: [['body', 'M3 13c3-3 6-3 9 0s6 3 9 0 6-3 8-1v4c-2-2-5-2-8 1s-6 3-9 0-6-3-9 0z M3 21c3-3 6-3 9 0s6 3 9 0 6-3 8-1v4c-2-2-5-2-8 1s-6 3-9 0-6-3-9 0z']],
};

const ICON_NAMES = Object.keys(ICONS);
const ICON_INDEX = {};
ICON_NAMES.forEach((n, i) => (ICON_INDEX[n] = i));

function iconRoleColor(role, colors) {
	return role === 'body' ? colors.body : role === 'dark' ? colors.dark : role === 'light' ? colors.light : role;
}

function iconSVG(name, colors, size = 24, extraClass = '') {
	const parts = ICONS[name] || ICONS.dot;
	let outline = '';
	let fills = '';
	for (const [role, d, sw] of parts) {
		const c = iconRoleColor(role, colors);
		if (sw) {
			outline += `<path d="${d}" fill="none" stroke="rgba(8,12,10,.55)" stroke-width="${sw + 1.6}" stroke-linecap="round" stroke-linejoin="round"/>`;
			fills += `<path d="${d}" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round"/>`;
		} else {
			outline += `<path d="${d}" fill="none" stroke="rgba(8,12,10,.55)" stroke-width="1.6" stroke-linejoin="round"/>`;
			fills += `<path d="${d}" fill="${c}"/>`;
		}
	}
	return `<svg class="icon ${extraClass}" viewBox="-1 -1 34 34" width="${size}" height="${size}" aria-hidden="true">${outline}${fills}</svg>`;
}

function speciesColors(sp) {
	return { body: sp.color, dark: sp.colorDark, light: sp.colorLight };
}

function buildIconAtlas(cell = 64) {
	const cols = 8;
	const rows = Math.ceil(ICON_NAMES.length / cols);
	const w = cols * cell;
	const h = rows * cell;
	const mk = () => {
		const c = document.createElement('canvas');
		c.width = w;
		c.height = h;
		return c;
	};
	const roleC = mk();
	const fixC = mk();
	const rc = roleC.getContext('2d', { willReadFrequently: true });
	const fc = fixC.getContext('2d', { willReadFrequently: true });
	const pad = cell * 0.06;
	const scale = (cell - pad * 2) / 32;
	const ROLE_RGB = { body: '#ff0000', dark: '#00ff00', light: '#0000ff' };
	ICON_NAMES.forEach((name, idx) => {
		const ox = (idx % cols) * cell + pad;
		const oy = Math.floor(idx / cols) * cell + pad;
		const parts = ICONS[name].map(([role, d, sw]) => [role, new Path2D(d), sw]);
		for (const ctx of [rc, fc]) {
			ctx.setTransform(scale, 0, 0, scale, ox, oy);
			ctx.lineJoin = 'round';
			ctx.lineCap = 'round';
		}
		if (name !== 'ring') {
			for (const [, p, sw] of parts) {
				rc.lineWidth = fc.lineWidth = (sw || 0) + 1.8;
				rc.strokeStyle = '#000';
				fc.strokeStyle = 'rgba(10,14,12,0.9)';
				rc.stroke(p);
				fc.stroke(p);
			}
		}
		for (const [role, p, sw] of parts) {
			const fixed = role[0] === '#';
			rc.globalCompositeOperation = 'source-over';
			rc.fillStyle = rc.strokeStyle = fixed ? '#000' : ROLE_RGB[role];
			fc.globalCompositeOperation = fixed ? 'source-over' : 'destination-out';
			fc.fillStyle = fc.strokeStyle = fixed ? role : '#000';
			if (sw) {
				rc.lineWidth = fc.lineWidth = sw;
				rc.stroke(p);
				fc.stroke(p);
			} else {
				rc.fill(p);
				fc.fill(p);
			}
		}
		fc.globalCompositeOperation = 'source-over';
	});
	const premul = (ctx) => {
		const img = ctx.getImageData(0, 0, w, h);
		const d = img.data;
		for (let i = 0; i < d.length; i += 4) {
			const a = d[i + 3] / 255;
			d[i] = Math.round(d[i] * a);
			d[i + 1] = Math.round(d[i + 1] * a);
			d[i + 2] = Math.round(d[i + 2] * a);
		}
		return new Uint8Array(d.buffer);
	};
	return { width: w, height: h, cols, rows, cell, role: premul(rc), fixed: premul(fc) };
}
