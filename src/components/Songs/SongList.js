import React from 'react';
import SongBrowser from './SongBrowser';
import Seo from '../Common/Seo';

const SongList = () => {
  return (
    <>
      <Seo
        title="Усі пісні"
        description="Каталог українських пісень зі словами та акордами. Знайдіть улюблену пісню за назвою, автором чи розділом."
        path="/songs"
      />
      <SongBrowser />
    </>
  );
};

export default SongList;
