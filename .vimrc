syntax enable           " enable syntax

set nocompatible        " enable some extra features by turning off vi compatibility

set tabstop=4           " number of visual spaces per tab
set softtabstop=4       " number of spaces in tab when editing
set expandtab           " turn tabs to spaces

set number              " show line numbers
set showcmd             " show last command in bottom bar
set cursorline          " highlight current line
" highlight line in light blue
highlight CursorLine cterm=NONE ctermbg=LightBlue
filetype indent on      " filetype specific specific indent files
set wildmenu            " visual autocomplete for : commands
set lazyredraw          " redraw only when needed, for faster macros
set showmatch           " highlight matchin [, {, and (

set incsearch           " search as you type
set hlsearch            " highlight matches

set foldenable          " enable folding
set foldlevelstart=99   " open all folds by default
set foldnestmax=10      " 10 nested fold max
" space open/closes folds
nnoremap <space> za
set foldmethod=indent   " fold based on indent.  Use :help foldmethod to learn more

" move vertically by visual line, not actual line
nnoremap j gj
nnoremap k gk
" highlight last inserted text
nnoremap gV `[v`]
" jj is escape
inoremap jj <Esc>`^
set mouse=a             " mouse works in all modes

" not 100% sure what these do any more
set viminfo='50,f1      " save up to 50 recent marks across files
" highlight line numbers in grey
highlight LineNr ctermfg=grey
set shiftwidth=4

call plug#begin()
" elixir + eex suppport
Plug 'elixir-editors/vim-elixir'
call plug#end()
