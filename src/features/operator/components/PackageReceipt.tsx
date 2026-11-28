import { useState } from 'react';
import { ChevronLeft, ChevronRight, ImageOff, X, ZoomIn, ZoomOut } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '../../../components/ui/Dialog';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { usePackageReceiptQuery } from '../hooks/useOrderQueries';
import type { Order } from '../types/operator';
import { formatHubName } from '../utils/displayEnglish';
import { formatMissionTime } from '../utils/missionTiming';
import './package-receipt.css';

interface Props {
  order: Order;
  variant?: 'detail' | 'field';
}

function ReceiptImage({ url, className }: { url: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <span className="operator-receipt-image-fallback"><ImageOff size={18} aria-hidden="true" /><span>Image unavailable</span></span>
  ) : <img className={className} src={url} alt="Package received at origin hub" onError={() => setFailed(true)} />;
}

export function PackageReceipt({ order, variant = 'detail' }: Props) {
  const received = Boolean(order.originPackageReceived || order.originHubReceivedAt);
  const { data: photos = [], isError, isFetching, refetch } = usePackageReceiptQuery(order.id, order.originHubId, received);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const currentIndex = Math.min(index, Math.max(0, photos.length - 1));
  const photo = photos[currentIndex];
  const status = received ? 'Received at Hub' : 'Awaiting package';
  const time = order.originHubReceivedAt ? formatMissionTime(order.originHubReceivedAt) : '';
  const hub = photo?.hubName || ((!photo?.hubId || photo.hubId === order.originHubId) ? order.originHubName : '') || photo?.hubId || order.originHubId;

  return (
    <div className={`operator-receipt operator-receipt--${variant}`}>
      <div className="operator-receipt-status">
        <span>{status}</span>
        {time && (variant === 'field' ? <span> · {time}</span> : <small>{time}</small>)}
      </div>
      {received && (
        <Dialog open={open} onOpenChange={next => { setOpen(next); setIndex(0); setZoomed(false); }}>
          <DialogTrigger asChild>
            <button type="button" className="operator-receipt-view" title="View" aria-label="View package receipt">
              View
            </button>
          </DialogTrigger>
          <DialogContent
            className={`operator-receipt-dialog${zoomed ? ' operator-receipt-dialog--zoomed' : ''}`}
            aria-describedby={undefined}
            onEscapeKeyDown={event => { if (zoomed) { event.preventDefault(); setZoomed(false); } }}
          >
            <div className="operator-receipt-dialog-header">
              <DialogTitle className="operator-receipt-title">Package receipt</DialogTitle>
              <button type="button" className="operator-receipt-icon-button" aria-label={zoomed ? 'Exit enlarged photo' : 'Close package receipt'} onClick={() => zoomed ? setZoomed(false) : setOpen(false)}><X size={20} /></button>
            </div>
            <div className="operator-receipt-dialog-body">
              {!zoomed && <div className="operator-receipt-order"><strong>{order.id}</strong><StatusBadge tone="info">Received at Hub</StatusBadge></div>}
              {photo ? (
                <>
                  <button type="button" className="operator-receipt-photo" onClick={() => setZoomed(value => !value)} aria-label={zoomed ? 'Reduce photo size' : 'Enlarge package photo'}>
                    <ReceiptImage key={photo.url} url={photo.url} />
                    <span className="operator-receipt-photo-icon">{zoomed ? <ZoomOut size={18} /> : <ZoomIn size={18} />}</span>
                  </button>
                  <div className="operator-receipt-photo-nav">
                    {photos.length > 1 && <button type="button" className="operator-receipt-icon-button" aria-label="Previous photo" disabled={currentIndex === 0} onClick={() => setIndex(currentIndex - 1)}><ChevronLeft size={17} /></button>}
                    <span>{currentIndex + 1} / {photos.length}</span>
                    {photos.length > 1 && <button type="button" className="operator-receipt-icon-button" aria-label="Next photo" disabled={currentIndex === photos.length - 1} onClick={() => setIndex(currentIndex + 1)}><ChevronRight size={17} /></button>}
                  </div>
                </>
              ) : (
                <div className="operator-receipt-empty" role="status">
                  {isFetching ? (
                    <span>Loading package photo…</span>
                  ) : isError ? (
                    <>
                      <ImageOff size={20} aria-hidden="true" />
                      <span>Unable to load package photo.</span>
                      <button type="button" className="operator-receipt-view" onClick={() => void refetch()}>Retry</button>
                    </>
                  ) : (
                    <>
                      <ImageOff size={20} aria-hidden="true" />
                      <span>No package photo available.</span>
                    </>
                  )}
                </div>
              )}
              {!zoomed && (
                <dl className="operator-receipt-meta">
                  <div><dt>Hub</dt><dd>{formatHubName(hub) || '—'}</dd></div>
                  <div><dt>Recorded at</dt><dd>{photo?.recordedAt ? formatMissionTime(photo.recordedAt) : time || '—'}</dd></div>
                  <div><dt>Recorded by</dt><dd>{photo?.recordedBy || '—'}</dd></div>
                  <div><dt>Stage</dt><dd>Receive package</dd></div>
                </dl>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
