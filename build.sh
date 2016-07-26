CONF="WEB-INF/replace.conf"
JAR="WEB-INF/lib/replace.jar"
TYPE=
TEST=
DIRECTORY=
while [ $# -gt 0 ]
do
	case $1 in 
	-p )
	 	case $2 in
			wap )
				TYPE="wap"
			;;
			pc )
			;;
			*)
				echo "param must be wap or pc";
				exit 1;
			;;
		esac
	;;
	-t)
		TEST="-T"
	;;
	-d)
	     DIRECTORY=$2
	;;
	esac
	shift;
done
if [ "$TYPE"x = "wap"x ];then
	gulp production-wap
	if [ "$TEST"x = ""x ];then
		find dist/wap -name "*.html" -type f | xargs -I {}  sh replace.sh {} $JAR $CONF 
	fi
	rm -rf "./dist/wap/images/static"
	cp -r wap/images/static dist/wap/images
fi

