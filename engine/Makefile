# The sentence finder: the engine core (copied, see core/README.md) plus the
# sentence plug-in. Build: make -C engine    Test: make -C engine test

CC      = cc
CFLAGS  = -Wall -Wextra -Werror -std=c99 -O2 -Icore/include
SRC     = $(wildcard core/src/*.c) sentence/main.c
OBJ     = $(SRC:%.c=obj/%.o)
NAME    = sentence-engine

all: $(NAME)

$(NAME): $(OBJ)
	$(CC) $(CFLAGS) -o $@ $(OBJ)

obj/%.o: %.c core/include/engine.h
	@mkdir -p $(dir $@)
	$(CC) $(CFLAGS) -c $< -o $@

test: $(NAME)
	./tests/run_sentence_tests.sh ./$(NAME)

clean:
	rm -rf obj

fclean: clean
	rm -f $(NAME)

re: fclean all

.PHONY: all test clean fclean re
