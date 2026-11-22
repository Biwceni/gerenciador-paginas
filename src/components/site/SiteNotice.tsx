import React from 'react'

import { getHeader } from '@/lib/content'
import { activeNotice } from '@/lib/notice'

import { SiteNoticeView } from './SiteNoticeView'

/** O aviso publicado, quando há texto e o dia não passou. */
export async function SiteNotice() {
  const header = await getHeader()
  const notice = activeNotice(header.notice)
  return notice ? <SiteNoticeView end={notice.end} text={notice.text} /> : null
}
