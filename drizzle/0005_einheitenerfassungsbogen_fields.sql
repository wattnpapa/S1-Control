ALTER TABLE einsatz_einheit ADD COLUMN gr_fuehrer_name TEXT;
ALTER TABLE einsatz_einheit ADD COLUMN ov_name TEXT;
ALTER TABLE einsatz_einheit ADD COLUMN ov_telefon TEXT;
ALTER TABLE einsatz_einheit ADD COLUMN ov_fax TEXT;
ALTER TABLE einsatz_einheit ADD COLUMN rb_name TEXT;
ALTER TABLE einsatz_einheit ADD COLUMN rb_telefon TEXT;
ALTER TABLE einsatz_einheit ADD COLUMN rb_fax TEXT;
ALTER TABLE einsatz_einheit ADD COLUMN lv_name TEXT;
ALTER TABLE einsatz_einheit ADD COLUMN lv_telefon TEXT;
ALTER TABLE einsatz_einheit ADD COLUMN lv_fax TEXT;
ALTER TABLE einsatz_einheit ADD COLUMN bemerkung TEXT;

ALTER TABLE einsatz_fahrzeug ADD COLUMN funkrufname TEXT;
ALTER TABLE einsatz_fahrzeug ADD COLUMN stan_konform INTEGER;
ALTER TABLE einsatz_fahrzeug ADD COLUMN sondergeraet TEXT;
ALTER TABLE einsatz_fahrzeug ADD COLUMN nutzlast TEXT;
