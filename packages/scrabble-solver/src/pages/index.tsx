import { isObject } from '@scrabble-solver/types';
import fs from 'fs';
import path from 'path';
import { type ChangeEvent, type FunctionComponent, useRef, useState } from 'react';
import ReactModal from 'react-modal';
import { useDispatch } from 'react-redux';

import { Logo, NavButtons, Solver } from 'components';
import { useDirection, useEffectOnce, useLanguage, useLocalStorage } from 'hooks';
import { LOCALE_FEATURES } from 'i18n';
import { downloadBoardAsFile, readBoardFromFile } from '../lib/boardImportExport';
import {
  DictionaryModal,
  KeyMapModal,
  MenuModal,
  RemainingTilesModal,
  ResultsModal,
  SettingsModal,
  WordsModal,
} from 'modals';
import { registerServiceWorker } from 'serviceWorkerManager';
import {
  boardSlice,
  initialize,
  rackSlice,
  reset,
  selectBoard,
  selectConfig,
  selectGame,
  selectLocale,
  selectRack,
  useTypedSelector,
} from 'state';

import styles from './index.module.scss';

ReactModal.setAppElement('#__next');

interface Props {
  version: string;
}

type Modal = 'dictionary' | 'keyMap' | 'menu' | 'remainingTiles' | 'results' | 'settings' | 'words';

const Index: FunctionComponent<Props> = ({ version }) => {
  const dispatch = useDispatch();
  const config = useTypedSelector(selectConfig);
  const locale = useTypedSelector(selectLocale);
  const game = useTypedSelector(selectGame);
  const board = useTypedSelector(selectBoard);
  const rack = useTypedSelector(selectRack);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isClient, setIsClient] = useState(false);
  const [modals, setModals] = useState<Record<Modal, boolean>>({
    dictionary: false,
    keyMap: false,
    menu: false,
    remainingTiles: false,
    results: false,
    settings: false,
    words: false,
  });

  const patchModals = (patch: Partial<Record<Modal, boolean>>) => {
    setModals((current) => ({ ...current, ...patch }));
  };

  useDirection(LOCALE_FEATURES[locale].direction);
  useLanguage(locale);
  useLocalStorage();

  const handleExport = () => {
    try {
      downloadBoardAsFile(
        {
          game,
          locale,
          board,
          rack: rack.map((tile) => tile || ''),
        },
        `scrabble-board-${game}-${new Date().toISOString().split('T')[0]}.txt`,
      );
    } catch (error) {
      console.error('Failed to export board:', error);
      alert('Failed to export board. Please try again.');
    }
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const result = await readBoardFromFile(file);
      
      // Show warnings if any
      if (result.warnings.length > 0) {
        console.warn('Import warnings:', result.warnings);
      }

      // Update board and rack
      dispatch(boardSlice.actions.change(result.board));
      dispatch(rackSlice.actions.init(result.rack));

      // Note: game and locale are not changed automatically
      // User can change them via settings if needed
      if (result.game !== game || result.locale !== locale) {
        alert(
          `Note: This board was saved with game "${result.game}" and locale "${result.locale}". ` +
            `Your current settings are "${game}" and "${locale}". ` +
            `You may want to adjust your settings to match.`,
        );
      }
    } catch (error) {
      console.error('Failed to import board:', error);
      alert(`Failed to import board: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Reset file input
    event.target.value = '';
  };

  useEffectOnce(() => {
    if (process.env.NODE_ENV === 'production') {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      registerServiceWorker();
    }

    setIsClient(true);
    dispatch(initialize());
  });

  if (!isClient) {
    return null;
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <nav className={styles.nav}>
        <div className={styles.navContent}>
          <div className={styles.navLogo}>
            <a className={styles.logoContainer} href="/" title={version}>
              <Logo className={styles.logo} />
            </a>
          </div>

          <NavButtons
            onClear={() => dispatch(reset())}
            onExport={handleExport}
            onImport={handleImport}
            onShowKeyMap={() => patchModals({ keyMap: true })}
            onShowMenu={() => patchModals({ menu: true })}
            onShowRemainingTiles={() => patchModals({ remainingTiles: true })}
            onShowSettings={() => patchModals({ settings: true })}
            onShowWords={() => patchModals({ words: true })}
          />
        </div>
      </nav>

      <Solver className={styles.solver} onShowResults={() => patchModals({ results: true })} />

      <MenuModal
        isOpen={modals.menu}
        onClose={() => patchModals({ menu: false })}
        onShowDictionary={() => patchModals({ dictionary: true })}
        onShowRemainingTiles={() => patchModals({ remainingTiles: true })}
        onShowSettings={() => patchModals({ settings: true })}
        onShowWords={() => patchModals({ words: true })}
      />

      <SettingsModal isOpen={modals.settings} onClose={() => patchModals({ settings: false })} />

      <KeyMapModal isOpen={modals.keyMap} onClose={() => patchModals({ keyMap: false })} />

      <WordsModal isOpen={modals.words} onClose={() => patchModals({ words: false })} />

      {config.supportsRemainingTiles && (
        <RemainingTilesModal isOpen={modals.remainingTiles} onClose={() => patchModals({ remainingTiles: false })} />
      )}

      <ResultsModal isOpen={modals.results} onClose={() => patchModals({ results: false })} />

      <DictionaryModal isOpen={modals.dictionary} onClose={() => patchModals({ dictionary: false })} />
    </>
  );
};

export const getStaticProps = async (): Promise<{ props: Props }> => {
  const version = await readVersion();
  return { props: { version } };
};

const readVersion = async (): Promise<string> => {
  const packageJsonFilepath = path.resolve(process.cwd(), 'package.json');
  const data = await fs.promises.readFile(packageJsonFilepath, 'utf-8');
  const packageJson = JSON.parse(data);

  if (!isObject(packageJson) || !('version' in packageJson) || typeof packageJson.version !== 'string') {
    throw new Error('Invalid package.json');
  }

  return `v${packageJson.version}`;
};

export default Index;
