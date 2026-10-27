import * as migration_20261025_005205_initial from './20261025_005205_initial';
import * as migration_20261025_174452_users_role from './20261025_174452_users_role';
import * as migration_20261025_192209_paginas_e_globals from './20261025_192209_paginas_e_globals';
import * as migration_20261025_194602_visual_do_prototipo from './20261025_194602_visual_do_prototipo';
import * as migration_20261025_214813_marca_paginas_de_teste from './20261025_214813_marca_paginas_de_teste';
import * as migration_20261025_225422_rascunho_automatico from './20261025_225422_rascunho_automatico';
import * as migration_20261025_234228_link_para_secao from './20261025_234228_link_para_secao';
import * as migration_20261027_003103_formularios from './20261027_003103_formularios';
import * as migration_20261027_013052_rls_tabelas from './20261027_013052_rls_tabelas';

export const migrations = [
  {
    up: migration_20261025_005205_initial.up,
    down: migration_20261025_005205_initial.down,
    name: '20261025_005205_initial',
  },
  {
    up: migration_20261025_174452_users_role.up,
    down: migration_20261025_174452_users_role.down,
    name: '20261025_174452_users_role',
  },
  {
    up: migration_20261025_192209_paginas_e_globals.up,
    down: migration_20261025_192209_paginas_e_globals.down,
    name: '20261025_192209_paginas_e_globals',
  },
  {
    up: migration_20261025_194602_visual_do_prototipo.up,
    down: migration_20261025_194602_visual_do_prototipo.down,
    name: '20261025_194602_visual_do_prototipo',
  },
  {
    up: migration_20261025_214813_marca_paginas_de_teste.up,
    down: migration_20261025_214813_marca_paginas_de_teste.down,
    name: '20261025_214813_marca_paginas_de_teste',
  },
  {
    up: migration_20261025_225422_rascunho_automatico.up,
    down: migration_20261025_225422_rascunho_automatico.down,
    name: '20261025_225422_rascunho_automatico',
  },
  {
    up: migration_20261025_234228_link_para_secao.up,
    down: migration_20261025_234228_link_para_secao.down,
    name: '20261025_234228_link_para_secao',
  },
  {
    up: migration_20261027_003103_formularios.up,
    down: migration_20261027_003103_formularios.down,
    name: '20261027_003103_formularios',
  },
  {
    up: migration_20261027_013052_rls_tabelas.up,
    down: migration_20261027_013052_rls_tabelas.down,
    name: '20261027_013052_rls_tabelas'
  },
];
