import * as migration_20261025_005205_initial from './20261025_005205_initial';
import * as migration_20261025_174452_users_role from './20261025_174452_users_role';
import * as migration_20261025_192209_paginas_e_globals from './20261025_192209_paginas_e_globals';
import * as migration_20261025_194602_visual_do_prototipo from './20261025_194602_visual_do_prototipo';
import * as migration_20261025_214813_marca_paginas_de_teste from './20261025_214813_marca_paginas_de_teste';
import * as migration_20261025_225422_rascunho_automatico from './20261025_225422_rascunho_automatico';
import * as migration_20261025_234228_link_para_secao from './20261025_234228_link_para_secao';
import * as migration_20261027_003103_formularios from './20261027_003103_formularios';
import * as migration_20261027_013052_rls_tabelas from './20261027_013052_rls_tabelas';
import * as migration_20261027_232634_modelos from './20261027_232634_modelos';
import * as migration_20261030_002210_arquivar_paginas from './20261030_002210_arquivar_paginas';
import * as migration_20261101_165917_mensagens_lidas from './20261101_165917_mensagens_lidas';
import * as migration_20261101_165921_campo_telefone from './20261101_165921_campo_telefone';
import * as migration_20261101_170000_converter_whatsapp from './20261101_170000_converter_whatsapp';
import * as migration_20261101_190417_descricao_foto_opcional from './20261101_190417_descricao_foto_opcional';
import * as migration_20261101_190421_pagina_de_privacidade from './20261101_190421_pagina_de_privacidade';
import * as migration_20261107_180330_personalidade_do_site from './20261107_180330_personalidade_do_site';
import * as migration_20261107_205051_animacao_do_site from './20261107_205051_animacao_do_site';
import * as migration_20261115_022319_personalidade_papel from './20261115_022319_personalidade_papel';
import * as migration_20261115_022320_personalidade_papel_padrao from './20261115_022320_personalidade_papel_padrao';
import * as migration_20261116_012023_minhas_secoes from './20261116_012023_minhas_secoes';
import * as migration_20261116_170000_versoes_em_cascata from './20261116_170000_versoes_em_cascata';

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
    name: '20261027_013052_rls_tabelas',
  },
  {
    up: migration_20261027_232634_modelos.up,
    down: migration_20261027_232634_modelos.down,
    name: '20261027_232634_modelos',
  },
  {
    up: migration_20261030_002210_arquivar_paginas.up,
    down: migration_20261030_002210_arquivar_paginas.down,
    name: '20261030_002210_arquivar_paginas',
  },
  {
    up: migration_20261101_165917_mensagens_lidas.up,
    down: migration_20261101_165917_mensagens_lidas.down,
    name: '20261101_165917_mensagens_lidas',
  },
  {
    up: migration_20261101_165921_campo_telefone.up,
    down: migration_20261101_165921_campo_telefone.down,
    name: '20261101_165921_campo_telefone',
  },
  {
    up: migration_20261101_170000_converter_whatsapp.up,
    down: migration_20261101_170000_converter_whatsapp.down,
    name: '20261101_170000_converter_whatsapp',
  },
  {
    up: migration_20261101_190417_descricao_foto_opcional.up,
    down: migration_20261101_190417_descricao_foto_opcional.down,
    name: '20261101_190417_descricao_foto_opcional',
  },
  {
    up: migration_20261101_190421_pagina_de_privacidade.up,
    down: migration_20261101_190421_pagina_de_privacidade.down,
    name: '20261101_190421_pagina_de_privacidade',
  },
  {
    up: migration_20261107_180330_personalidade_do_site.up,
    down: migration_20261107_180330_personalidade_do_site.down,
    name: '20261107_180330_personalidade_do_site',
  },
  {
    up: migration_20261107_205051_animacao_do_site.up,
    down: migration_20261107_205051_animacao_do_site.down,
    name: '20261107_205051_animacao_do_site',
  },
  {
    up: migration_20261115_022319_personalidade_papel.up,
    down: migration_20261115_022319_personalidade_papel.down,
    name: '20261115_022319_personalidade_papel',
  },
  {
    up: migration_20261115_022320_personalidade_papel_padrao.up,
    down: migration_20261115_022320_personalidade_papel_padrao.down,
    name: '20261115_022320_personalidade_papel_padrao',
  },
  {
    up: migration_20261116_012023_minhas_secoes.up,
    down: migration_20261116_012023_minhas_secoes.down,
    name: '20261116_012023_minhas_secoes',
  },
  {
    up: migration_20261116_170000_versoes_em_cascata.up,
    down: migration_20261116_170000_versoes_em_cascata.down,
    name: '20261116_170000_versoes_em_cascata',
  },
];
