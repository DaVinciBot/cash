import { describe, expect, it } from 'vitest';

import { parseDomains } from '$lib/server/treasury';
import {
	ACCOUNT_KIND_LABELS,
	ACCOUNT_KINDS,
	countsTowardTreasury,
	FLOW_DIRECTION_BADGES,
	FLOW_DIRECTIONS,
	FLOW_ORIGINS,
	isFlowGenerated
} from '@davincibot/lib';

describe('référentiel de trésorerie (§6.2, §6.3)', () => {
	it('couvre exactement les enums de la base', () => {
		expect(FLOW_DIRECTIONS).toEqual(['debit', 'credit']);
		expect(FLOW_ORIGINS).toEqual(['auto', 'manual']);
		expect(ACCOUNT_KINDS).toEqual(['current', 'savings', 'partner_credit']);
	});

	it('donne un repère visuel distinct à chaque sens', () => {
		for (const direction of FLOW_DIRECTIONS) {
			expect(FLOW_DIRECTION_BADGES[direction].label).toBeTruthy();
		}
		expect(FLOW_DIRECTION_BADGES.debit.className).not.toBe(FLOW_DIRECTION_BADGES.credit.className);
	});

	it('nomme chaque type de compte', () => {
		for (const kind of ACCOUNT_KINDS) {
			expect(ACCOUNT_KIND_LABELS[kind]).toBeTruthy();
		}
	});

	// TRESO-F-15 — une enveloppe partenaire est un avoir chez un tiers.
	// L'additionner au solde ferait croire à une capacité de paiement inexistante.
	it('exclut les enveloppes partenaires du solde de trésorerie', () => {
		expect(countsTowardTreasury('current')).toBe(true);
		expect(countsTowardTreasury('savings')).toBe(true);
		expect(countsTowardTreasury('partner_credit')).toBe(false);
	});

	it("distingue un flux généré d'une saisie", () => {
		expect(isFlowGenerated('auto')).toBe(true);
		expect(isFlowGenerated('manual')).toBe(false);
	});
});

describe('normalisation des domaines de partenariat (TRESO-F-12)', () => {
	// `items.domain` est extrait du lien sans sous-domaine ni extension : un
	// partenariat qui enregistrerait « eu.mouser.com » ne se reconnaîtrait dans
	// aucun item.
	it("ramène toutes les formes d'un même marchand à un seul domaine", () => {
		expect(parseDomains('mouser.fr, eu.mouser.com, https://www.mouser.com/catalog')).toEqual([
			'mouser'
		]);
	});

	it('accepte les séparateurs libres et ignore les vides', () => {
		expect(parseDomains('gotronic.fr   rs-france.com,,')).toEqual(['gotronic', 'rs-france']);
	});

	it("remonte d'un cran sur une extension composée", () => {
		expect(parseDomains('rs-online.co.uk')).toEqual(['rs-online']);
		expect(parseDomains('shop.example.com.au')).toEqual(['example']);
	});

	it('laisse passer une saisie déjà normalisée', () => {
		expect(parseDomains('mouser')).toEqual(['mouser']);
	});

	it('ne renvoie rien pour une saisie vide', () => {
		expect(parseDomains('')).toEqual([]);
		expect(parseDomains('  ,  ')).toEqual([]);
	});
});
