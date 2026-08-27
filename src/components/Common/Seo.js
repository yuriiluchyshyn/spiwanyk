import React from 'react';
import { Helmet } from 'react-helmet-async';
import { SITE_URL, SITE_NAME, DEFAULT_OG_IMAGE } from '../../config/seo';

/**
 * Реюзабельний компонент для унікальних SEO-тегів кожної сторінки.
 *
 * @param {string} title       Заголовок сторінки (без назви бренду — вона додається автоматично)
 * @param {string} description Опис сторінки для пошуковиків та соцмереж
 * @param {string} path        Шлях сторінки, напр. "/songs" (для canonical та og:url)
 * @param {string} image       Абсолютний URL зображення для соцмереж
 * @param {string} type        og:type ("website" або "article")
 * @param {boolean} noindex    Заборонити індексацію (для приватних сторінок)
 */
const Seo = ({
  title,
  description,
  path = '',
  image = DEFAULT_OG_IMAGE,
  type = 'website',
  noindex = false,
}) => {
  const fullTitle = title ? `${title} — ${SITE_NAME}` : SITE_NAME;
  const url = `${SITE_URL}${path}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      <meta name="robots" content={noindex ? 'noindex, nofollow' : 'index, follow'} />
      <link rel="canonical" href={url} />

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:url" content={url} />
      <meta property="og:image" content={image} />
      <meta property="og:locale" content="uk_UA" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
};

export default Seo;
