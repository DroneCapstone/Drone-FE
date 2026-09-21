import { useState } from 'react';

import { ActionButton } from '../../../../components/ui/ActionButton';
import { DropdownSelect } from '../../../../components/ui/DropdownSelect';
import { Icon } from '../../../../components/ui/Icon';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import { DepartureDateTimePicker } from '../../../../components/common/DateTimePicker/DateTimePicker';

import { OperatorPanel } from '../../components/OperatorPanel';

import { MissionPageShell } from './MissionPageShell';

export function CreateMissionPage() {
  const [toast, setToast] = useState('');

  const [missionType, setMissionType] = useState('Priority delivery');

  const [priority, setPriority] = useState('High');

  const [aircraft, setAircraft] = useState('AX-17 · Ready · 96%');

  const showToast = () => {
    setToast('Mission draft created successfully');

    setTimeout(() => {
      setToast('');
    }, 2400);
  };

  const [departure, setDeparture] = useState<Date | undefined>(
    new Date(2026, 8, 15, 14, 30),
  );

  return (
    <MissionPageShell active="/operator/missions/create">
      <form
        className="form-grid"
        onSubmit={(event) => {
          event.preventDefault();
          showToast();
        }}
      >
        {/* =====================================================
            STEP 01
        ===================================================== */}

        <OperatorPanel title="Mission brief" eyebrow="STEP 01">
          <div className="fields two">
            <label>
              <span>Mission name</span>

              <input
                required
                defaultValue="Harbor medical relay"
              />
            </label>

            <label>
              <span>Mission type</span>

              <DropdownSelect
                className="w-full min-w-0"
                value={missionType}
                options={[
                  'Priority delivery',
                  'Inspection',
                  'Recovery',
                ]}
                onChange={setMissionType}
                ariaLabel="Mission type"
              />
            </label>

            <label className="wide">
              <span>Operational objective</span>

              <textarea
                className="objective-textarea"
                defaultValue="Deliver temperature-controlled medical payload to Harbor Station 04."
                onInput={(event) => {
                  const textarea = event.currentTarget;

                  /*
                   * Chiều cao tối đa.
                   * Đến đây textarea ngừng lớn
                   * và bắt đầu scroll bên trong.
                   */
                  const maxHeight = 365;

                  /*
                   * Reset height trước để browser
                   * tính lại scrollHeight chính xác.
                   */
                  textarea.style.height = 'auto';

                  const contentHeight = textarea.scrollHeight;

                  const nextHeight = Math.min(
                    contentHeight,
                    maxHeight,
                  );

                  textarea.style.height = `${nextHeight}px`;

                  /*
                   * Chưa chạm giới hạn:
                   * không hiện scrollbar.
                   *
                   * Chạm giới hạn:
                   * mới cho scroll.
                   */
                  textarea.style.overflowY =
                    contentHeight > maxHeight
                      ? 'auto'
                      : 'hidden';
                }}
              />
            </label>
          </div>
        </OperatorPanel>

        {/* =====================================================
            STEP 02
        ===================================================== */}

        <OperatorPanel
          title="Route & schedule"
          eyebrow="STEP 02"
        >
          <div className="fields two">
            <label>
              <span>Origin</span>

              <input defaultValue="SGN Central Hub" />
            </label>

            <label>
              <span>Destination</span>

              <input defaultValue="Harbor Station 04" />
            </label>

            {/* <label>
              <span>Departure</span>

              <input
                type="datetime-local"
                defaultValue="2026-09-15T14:30"
              />
            </label> */}

            <div className="select-field">
              <span>Departure</span>

              <DepartureDateTimePicker
                value={departure}
                onChange={setDeparture}
                placeholder="Select departure date & time"
              />
            </div>

            <label>
              <span>Priority</span>

              <DropdownSelect
                className="w-full min-w-0"
                value={priority}
                options={[
                  'High',
                  'Normal',
                  'Emergency',
                ]}
                onChange={setPriority}
                ariaLabel="Priority"
              />
            </label>
          </div>

          <div className="route-preview">
            <Icon name="pin" />

            <span>SGN Central Hub</span>

            <i />

            <span>Harbor Station 04</span>

            <strong>18.4 km</strong>
          </div>
        </OperatorPanel>

        {/* =====================================================
            STEP 03
        ===================================================== */}

        <OperatorPanel
          title="Aircraft & payload"
          eyebrow="STEP 03"
        >
          <div className="fields two">
            <label>
              <span>Aircraft</span>

              <DropdownSelect
                className="w-full min-w-0"
                value={aircraft}
                options={[
                  'AX-17 · Ready · 96%',
                  'AX-04 · Ready · 100%',
                ]}
                onChange={setAircraft}
                ariaLabel="Aircraft"
              />
            </label>

            <label>
              <span>Payload weight</span>

              <div className="input-suffix">
                <input
                  type="number"
                  defaultValue="4.8"
                />

                <span>kg</span>
              </div>
            </label>
          </div>

          <div className="prediction-strip">
            <span>Pre-flight estimate</span>

            <strong>28 min</strong>

            <span>·</span>

            <strong>23% energy</strong>

            <StatusBadge tone="success">
              Low risk
            </StatusBadge>
          </div>
        </OperatorPanel>

        {/* =====================================================
            ACTIONS
        ===================================================== */}

        <div className="form-actions">
          <ActionButton variant="secondary">
            Save draft
          </ActionButton>

          <ActionButton type="submit">
            Continue to review
          </ActionButton>
        </div>
      </form>

      {toast && (
        <div className="toast">
          <Icon name="check" />
          {toast}
        </div>
      )}
    </MissionPageShell>
  );
}